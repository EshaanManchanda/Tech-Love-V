import { Router } from "express";
import type Stripe from "stripe";
import { activationLimitFor, productForPlan } from "../config/plans.js";
import { Coupon } from "../models/Coupon.js";
import { CouponRedemption } from "../models/CouponRedemption.js";
import { License } from "../models/License.js";
import { Subscription, type BillingCycle } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { generateLicenseKey } from "../services/licenseService.js";
import { findPrimaryOrganization } from "../services/organizationService.js";
import { enqueueEmail } from "../queues/emailQueue.js";
import { stripeProvider } from "../services/payments/stripe.provider.js";
import { planForPriceId, stripe } from "../services/stripeClient.js";

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
    await WebhookEvent.create({ stripe_event_id: event.id, type: event.type });
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
      const plan = priceId ? planForPriceId(priceId) : null;
      if (!plan) break;

      const user = await User.findById(userId);
      if (!user) break;

      if (session.customer && !user.stripe_customer_id) {
        user.stripe_customer_id = session.customer as string;
        await user.save();
      }

      const organization = await findPrimaryOrganization(user._id);
      const cycle: BillingCycle = subscription.items.data[0]?.price.recurring?.interval === "year" ? "yearly" : "monthly";

      const subDoc = await Subscription.findOneAndUpdate(
        { provider_subscription_id: subscription.id },
        {
          user_id: user._id,
          organization_id: organization?._id,
          plan,
          provider: "stripe",
          provider_subscription_id: subscription.id,
          provider_price_id: priceId,
          status: "active",
          billing_cycle: cycle,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          updated_at: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const licenseExpiresAt = toIsoDate(subscription.current_period_end);
      const product = productForPlan(plan);
      const license = await License.create({
        license_key: generateLicenseKey(plan),
        user_id: user._id,
        organization_id: organization?._id,
        subscription_id: subDoc._id,
        product,
        plan,
        status: "active",
        activation_limit: activationLimitFor(plan),
        expires_at: licenseExpiresAt,
        // Legacy fields kept for licenses issued before Subscription existed — see model comment.
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
      });

      enqueueEmail("license-created", user.email, {
        name: user.name,
        plan,
        licenseKey: license.license_key,
        expiresAt: licenseExpiresAt,
      });

      const couponId = session.metadata?.coupon_id;
      if (couponId) {
        await Coupon.updateOne({ _id: couponId }, { $inc: { redemption_count: 1 } });
        await CouponRedemption.create({ coupon_id: couponId, user_id: user._id, subscription_id: subDoc._id });
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
