import { Router } from "express";
import type Stripe from "stripe";
import { planForPriceId } from "../config/plans.js";
import { License } from "../models/License.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { startSubscription } from "../services/billingService.js";
import { stripeProvider } from "../services/payments/stripe.provider.js";
import { stripe } from "../services/stripeClient.js";

export const stripeWebhookRouter = Router();

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

stripeWebhookRouter.post("/", async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event: Stripe.Event;
  try {
    event = stripeProvider.verifyWebhook(req.body, signature as string) as Stripe.Event;
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
  }

  // Idempotency: duplicate Stripe delivery of the same event must not double-create a license (doc §48).
  try {
    await WebhookEvent.create({ stripe_event_id: event.id, provider: "stripe", type: event.type });
  } catch {
    return res.status(200).json({ received: true, deduped: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      const fromMetadata = session.metadata?.product && session.metadata?.plan ? { product: session.metadata.product, plan: session.metadata.plan } : null;
      const target = fromMetadata ?? (priceId ? await planForPriceId(priceId) : null);
      if (!target) break;

      const started = await startSubscription({
        userId,
        product: target.product,
        plan: target.plan,
        provider: "stripe",
        providerSubscriptionId: subscription.id,
        providerPriceId: priceId,
        cycle: subscription.items.data[0]?.price.recurring?.interval === "year" ? "yearly" : "monthly",
        periodStart: new Date(subscription.current_period_start * 1000),
        periodEnd: new Date(subscription.current_period_end * 1000),
        couponId: session.metadata?.coupon_id,
        // Legacy fields kept for licenses issued before Subscription existed — see model comment.
        licenseExtras: { stripe_subscription_id: subscription.id, stripe_price_id: priceId },
      });
      if (started && session.customer) {
        await User.updateOne({ _id: userId, stripe_customer_id: { $exists: false } }, { stripe_customer_id: session.customer as string });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const periodEnd = new Date(subscription.current_period_end * 1000);

      const subDoc = await Subscription.findOneAndUpdate(
        { provider_subscription_id: subscription.id },
        {
          status: "active",
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: periodEnd,
          updated_at: new Date(),
        },
        { new: true },
      );

      // Prefer the subscription_id link; fall back to the legacy direct field
      // for any license issued before this Subscription document existed.
      await License.updateOne(
        subDoc ? { subscription_id: subDoc._id } : { stripe_subscription_id: subscription.id },
        { expires_at: toIsoDate(subscription.current_period_end), status: "active", updated_at: new Date() },
      );
      break;
    }

    case "invoice.payment_failed": {
      // Stripe retries the charge and emails the customer itself. The license keeps
      // its paid-through expires_at; a later invoice.paid sets the Subscription back
      // to active, and running out of retries ends in customer.subscription.deleted.
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) break;
      await Subscription.updateOne(
        { provider_subscription_id: invoice.subscription as string },
        { status: "past_due", updated_at: new Date() },
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await Subscription.updateOne(
        { provider_subscription_id: subscription.id },
        { status: "cancelled", cancelled_at: new Date(), updated_at: new Date() },
      );
      // License is intentionally left alone: expires_at already reflects the paid-through
      // date (set by the last invoice.paid) and naturally reads as expired via isExpired()
      // once that date passes — no separate cancellation flag needed for MVP.
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
});
