import { planForPriceId, type BillingCycle } from "../config/plans.js";
import { logger } from "../logger.js";
import { Subscription, type SubscriptionStatus } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { enqueueEmail } from "../queues/emailQueue.js";
import { changePlan, extendLicense, startSubscription, toIsoDate } from "./billingService.js";
import { lsApi, lsPeriodEnd, type LsSubscriptionAttributes, type LsSubscriptionStatus } from "./payments/lemonsqueezy.provider.js";

// Lemon Squeezy subscription state → ours. Used by the webhook, and by the sync that recovers
// from a webhook that never arrived (lost delivery, wrong URL, bad secret).

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

type LsSubscriptionWithEmail = LsSubscriptionAttributes & { user_email?: string };

function periodStartFor(periodEnd: Date, cycle: BillingCycle): Date {
  const start = new Date(periodEnd);
  if (cycle === "yearly") start.setUTCFullYear(start.getUTCFullYear() - 1);
  else start.setUTCMonth(start.getUTCMonth() - 1);
  return start;
}

export async function onSubscriptionCreated(id: string, attrs: LsSubscriptionWithEmail, custom: Record<string, string>) {
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
export async function syncSubscription(id: string, attrs: LsSubscriptionWithEmail, custom: Record<string, string>) {
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

  if (attrs.cancelled && !subscription.cancel_at_period_end && !refunded) {
    const user = await User.findById(subscription.user_id);
    if (user) {
      enqueueEmail("subscription-cancelled", user.email, {
        name: user.name,
        plan: subscription.plan,
        accessUntil: toIsoDate(periodEnd ?? subscription.current_period_end),
      });
    }
  }

  if (!refunded && periodEnd && PAID_THROUGH.includes(attrs.status)) await extendLicense(subscription, periodEnd);

  const variantId = String(attrs.variant_id);
  if (variantId !== subscription.provider_price_id) {
    const target = await planForPriceId(variantId);
    if (target) await changePlan(subscription, target.product, target.plan, variantId);
  }
}

/**
 * Pulls every LS subscription for this user's email and applies it: missing ones get their
 * Subscription + License issued, known ones are brought up to date. Safe to repeat.
 * Returns how many LS subscriptions were found.
 */
export async function syncLsSubscriptionsForUser(user: { _id: { toString(): string }; email: string }): Promise<number> {
  const query = new URLSearchParams({
    "filter[store_id]": String(process.env.LEMONSQUEEZY_STORE_ID ?? ""),
    "filter[user_email]": user.email,
    "page[size]": "100",
  });
  const { data } = await lsApi<{ data: { id: string; attributes: LsSubscriptionWithEmail }[] }>("GET", `/subscriptions?${query}`);
  for (const { id, attributes } of data) {
    await syncSubscription(id, attributes, { user_id: user._id.toString() });
  }
  return data.length;
}
