import { createHash } from "node:crypto";
import { Router } from "express";
import { logger } from "../logger.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { enqueueEmail } from "../queues/emailQueue.js";
import { refundSubscription } from "../services/billingService.js";
import { onSubscriptionCreated, syncSubscription } from "../services/lemonSqueezySync.js";
import { getLsSubscription, lemonSqueezyProvider, type LsSubscriptionAttributes } from "../services/payments/lemonsqueezy.provider.js";

export const lemonSqueezyWebhookRouter = Router();

interface LsWebhook {
  meta: { event_name: string; custom_data?: Record<string, string> };
  data: { type: string; id: string; attributes: Record<string, unknown> };
}

/**
 * LS marks a refund "full" (refunded: true) only to the paisa, but refunding the whole ₹248.72 of an INR order came
 * back as a "partial_refund" of ₹247.77: LS caps the refundable amount below the total (currency conversion).
 * So 95% or more of the order counts as the full refund our 7-day policy gives.
 */
const FULL_REFUND_SHARE = 0.95;
function isFullRefund(attrs: Record<string, unknown>): boolean {
  if (attrs.refunded === true) return true;
  const total = Number(attrs.total);
  const refunded = Number(attrs.refunded_amount);
  return total > 0 && refunded >= total * FULL_REFUND_SHARE;
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

    case "subscription_payment_failed": {
      // LS retries the charge. The license keeps its paid-through date,
      // and the plugin's 3-day grace covers a retry that succeeds just after it.
      const subscription = await Subscription.findOneAndUpdate(
        { provider_subscription_id: String(attributes.subscription_id), status: { $ne: "cancelled" } },
        { status: "past_due", updated_at: new Date() },
      );
      const user = subscription && (await User.findById(subscription.user_id));
      if (user) enqueueEmail("payment-failed", user.email, { name: user.name, plan: subscription.plan, billingUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/billing` });
      break;
    }

    // A full refund cancels the license; a genuinely partial one (e.g. goodwill credit) leaves it alone.
    case "subscription_payment_refunded": {
      if (!isFullRefund(attributes)) break;
      const subscription = await Subscription.findOne({ provider_subscription_id: String(attributes.subscription_id) });
      if (subscription) await refundSubscription(subscription);
      break;
    }

    case "order_refunded": {
      if (!isFullRefund(attributes)) break;
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
