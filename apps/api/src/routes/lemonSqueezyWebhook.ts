import { createHash } from "node:crypto";
import { Router } from "express";
import { planForPriceId, type BillingCycle } from "../config/plans.js";
import { logger } from "../logger.js";
import { Subscription, type SubscriptionStatus } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { changePlan, extendLicense, refundSubscription, startSubscription } from "../services/billingService.js";
import {
  getLsSubscription,
  lemonSqueezyProvider,
  lsPeriodEnd,
  type LsSubscriptionAttributes,
  type LsSubscriptionStatus,
} from "../services/payments/lemonsqueezy.provider.js";

export const lemonSqueezyWebhookRouter = Router();

interface LsWebhook {
  meta: { event_name: string; custom_data?: Record<string, string> };
  data: { type: string; id: string; attributes: Record<string, unknown> };
}

// LS "cancelled" means "won't renew, paid until ends_at" — still usable, so it maps to
// active + cancel_at_period_end. Our "cancelled" is reserved for refunds (billingService).
const STATUS: Record<LsSubscriptionStatus, SubscriptionStatus> = {
  on_trial: "trialing",
  active: "active",
  paused: "paused",
  past_due: "past_due",
  unpaid: "unpaid",
  cancelled: "active",
  expired: "expired",
};
const PAID_THROUGH: LsSubscriptionStatus[] = ["on_trial", "active", "cancelled"];

function periodStartFor(periodEnd: Date, cycle: BillingCycle): Date {
  const start = new Date(periodEnd);
  if (cycle === "yearly") start.setUTCFullYear(start.getUTCFullYear() - 1);
  else start.setUTCMonth(start.getUTCMonth() - 1);
  return start;
}

async function onSubscriptionCreated(id: string, attrs: LsSubscriptionAttributes & { user_email?: string }, custom: Record<string, string>) {
  const variantId = String(attrs.variant_id);
  const fromVariant = await planForPriceId(variantId);
  const target = custom.product && custom.plan ? { product: custom.product, plan: custom.plan } : fromVariant;
  const periodEnd = lsPeriodEnd(attrs);
  if (!target || !periodEnd) {
    logger.warn({ id, variantId }, "lemonsqueezy: subscription for an unknown variant, no license issued");
    return;
  }

  // Checkouts we create carry user_id; a purchase made straight from the LS store falls back to the email.
  const user = custom.user_id
    ? await User.findById(custom.user_id)
    : attrs.user_email
      ? await User.findOne({ email: attrs.user_email.toLowerCase() })
      : null;
  if (!user) {
    logger.warn({ id, email: attrs.user_email }, "lemonsqueezy: subscription for an unknown user, no license issued");
    return;
  }

  const cycle = (custom.cycle as BillingCycle | undefined) ?? fromVariant?.cycle ?? "monthly";
  const started = await startSubscription({
    userId: user._id.toString(),
    product: target.product,
    plan: target.plan,
    provider: "lemonsqueezy",
    providerSubscriptionId: id,
    providerPriceId: variantId,
    providerOrderId: String(attrs.order_id),
    cycle,
    periodStart: periodStartFor(periodEnd, cycle),
    periodEnd,
    couponId: custom.coupon_id,
  });
  if (started && !user.lemonsqueezy_customer_id) {
    await User.updateOne({ _id: user._id }, { lemonsqueezy_customer_id: String(attrs.customer_id) });
  }
}

/** Mirrors an LS subscription's current state (renewal, cancel, resume, expiry, plan change) onto ours. */
async function syncSubscription(id: string, attrs: LsSubscriptionAttributes, custom: Record<string, string>) {
  const subscription = await Subscription.findOne({ provider_subscription_id: id });
  if (!subscription) {
    // subscription_created hasn't been processed (lost or out of order): this event carries everything it needs.
    if (custom.user_id) await onSubscriptionCreated(id, attrs, custom);
    return;
  }

  const periodEnd = lsPeriodEnd(attrs);
  // A refunded subscription stays cancelled; only its final expiry is recorded.
  const refunded = subscription.status === "cancelled";
  const status: SubscriptionStatus = refunded && attrs.status !== "expired" ? "cancelled" : STATUS[attrs.status];
  await Subscription.updateOne(
    { _id: subscription._id },
    {
      status,
      cancel_at_period_end: attrs.cancelled,
      ...(periodEnd
        ? { current_period_end: periodEnd, current_period_start: periodStartFor(periodEnd, subscription.billing_cycle) }
        : {}),
      ...(attrs.cancelled && !subscription.cancelled_at ? { cancelled_at: new Date() } : {}),
      updated_at: new Date(),
    },
  );

  if (!refunded && periodEnd && PAID_THROUGH.includes(attrs.status)) await extendLicense(subscription, periodEnd);

  const variantId = String(attrs.variant_id);
  if (variantId !== subscription.provider_price_id) {
    const target = await planForPriceId(variantId);
    if (target) await changePlan(subscription, target.product, target.plan, variantId);
  }
}

async function handle(event: LsWebhook) {
  const { event_name: name, custom_data: custom = {} } = event.meta;
  const { id, attributes } = event.data;

  switch (name) {
    case "subscription_created":
      await onSubscriptionCreated(id, attributes as unknown as LsSubscriptionAttributes, custom);
      break;

    case "subscription_updated":
    case "subscription_cancelled":
    case "subscription_resumed":
    case "subscription_expired":
    case "subscription_paused":
    case "subscription_unpaused":
      await syncSubscription(id, attributes as unknown as LsSubscriptionAttributes, custom);
      break;

    // The data of the subscription_payment_* events is a subscription invoice.
    case "subscription_payment_success":
    case "subscription_payment_recovered": {
      const subscriptionId = String(attributes.subscription_id);
      await syncSubscription(subscriptionId, await getLsSubscription(subscriptionId), custom);
      break;
    }

    case "subscription_payment_failed":
      // LS retries the charge and emails the customer. The license keeps its paid-through date,
      // and the plugin's 3-day grace covers a retry that succeeds just after it.
      await Subscription.updateOne(
        { provider_subscription_id: String(attributes.subscription_id), status: { $ne: "cancelled" } },
        { status: "past_due", updated_at: new Date() },
      );
      break;

    // Partial refunds leave the license alone; a full refund cancels it.
    case "subscription_payment_refunded": {
      if (attributes.refunded !== true) break;
      const subscription = await Subscription.findOne({ provider_subscription_id: String(attributes.subscription_id) });
      if (subscription) await refundSubscription(subscription);
      break;
    }

    case "order_refunded": {
      if (attributes.refunded !== true) break;
      const subscription = await Subscription.findOne({ provider: "lemonsqueezy", provider_order_id: id });
      if (!subscription) break;
      await refundSubscription(subscription);
      // A refunded order mustn't renew. LS cancels at the period end; the license is already cancelled.
      await lemonSqueezyProvider.cancelSubscription(subscription.provider_subscription_id).catch((err) => {
        logger.warn({ err, subscription: subscription.provider_subscription_id }, "lemonsqueezy: couldn't cancel refunded subscription");
      });
      break;
    }

    default:
      break;
  }
}

lemonSqueezyWebhookRouter.post("/", async (req, res) => {
  let event: LsWebhook;
  try {
    event = lemonSqueezyProvider.verifyWebhook(req.body, req.get("x-signature") ?? "") as LsWebhook;
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
  }

  // LS sends no event id: derive one from the event and the object's version, so a redelivery dedupes
  // but a later change to the same subscription doesn't.
  const fingerprint = [event.meta.event_name, event.data.type, event.data.id, String(event.data.attributes.updated_at ?? "")].join(":");
  const eventId = `ls_${createHash("sha256").update(fingerprint).digest("hex")}`;
  try {
    await WebhookEvent.create({ stripe_event_id: eventId, provider: "lemonsqueezy", type: event.meta.event_name });
  } catch {
    return res.status(200).json({ received: true, deduped: true });
  }

  try {
    await handle(event);
  } catch (err) {
    // Forget the event so LS's retry is processed instead of deduped away.
    await WebhookEvent.deleteOne({ stripe_event_id: eventId });
    throw err;
  }
  res.json({ received: true });
});
