import { resolveLicensePlan, type BillingCycle } from "../config/plans.js";
import { logger } from "../logger.js";
import { Coupon } from "../models/Coupon.js";
import { CouponRedemption } from "../models/CouponRedemption.js";
import { License, type LicenseDoc } from "../models/License.js";
import { Subscription, type SubscriptionDoc } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { enqueueEmail } from "../queues/emailQueue.js";
import { generateLicenseKey } from "./licenseService.js";
import { findPrimaryOrganization } from "./organizationService.js";
import { lemonSqueezyProvider, refundLsOrder } from "./payments/lemonsqueezy.provider.js";

// Provider-neutral subscription → license bookkeeping. The Stripe and Lemon Squeezy
// webhooks translate their events into these calls; our DB stays the source of truth.

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface StartSubscriptionInput {
  userId: string;
  product: string;
  plan: string;
  provider: SubscriptionDoc["provider"];
  providerSubscriptionId: string;
  providerPriceId: string;
  providerOrderId?: string;
  cycle: BillingCycle;
  periodStart: Date;
  periodEnd: Date;
  couponId?: string;
  /** Extra License fields, e.g. Stripe's legacy stripe_subscription_id. */
  licenseExtras?: Partial<LicenseDoc>;
}

/**
 * First payment: upsert the Subscription, issue a License (once, even if the
 * provider redelivers), email the key and record any coupon redemption.
 * Returns null when the plan or user can't be resolved.
 */
export async function startSubscription(input: StartSubscriptionInput) {
  const licensePlan = await resolveLicensePlan(input.product, input.plan);
  if (!licensePlan) return null;
  const user = await User.findById(input.userId);
  if (!user) return null;
  const organization = await findPrimaryOrganization(user._id);

  const subscription = await Subscription.findOneAndUpdate(
    { provider_subscription_id: input.providerSubscriptionId },
    {
      user_id: user._id,
      organization_id: organization?._id,
      product: licensePlan.product,
      plan: licensePlan.plan,
      provider: input.provider,
      provider_subscription_id: input.providerSubscriptionId,
      provider_price_id: input.providerPriceId,
      ...(input.providerOrderId ? { provider_order_id: input.providerOrderId } : {}),
      status: "active",
      billing_cycle: input.cycle,
      current_period_start: input.periodStart,
      current_period_end: input.periodEnd,
      updated_at: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const existing = await License.findOne({ subscription_id: subscription._id });
  if (existing) return { subscription, license: existing };

  const expiresAt = toIsoDate(input.periodEnd);
  const license = await License.create({
    license_key: generateLicenseKey(licensePlan.key_prefix),
    user_id: user._id,
    organization_id: organization?._id,
    subscription_id: subscription._id,
    product: licensePlan.product,
    plan: licensePlan.plan,
    status: "active",
    activation_limit: licensePlan.activation_limit,
    expires_at: expiresAt,
    ...input.licenseExtras,
  });

  enqueueEmail("license-created", user.email, {
    name: user.name,
    plan: licensePlan.plan,
    licenseKey: license.license_key,
    expiresAt,
  });

  if (input.couponId) {
    await Coupon.updateOne({ _id: input.couponId }, { $inc: { redemption_count: 1 } });
    await CouponRedemption.create({ coupon_id: input.couponId, user_id: user._id, subscription_id: subscription._id });
  }
  return { subscription, license };
}

/**
 * Moves a subscription's license to a new paid-through date. A license cancelled
 * by a refund (or suspended by an admin) is left alone, so a late webhook can't revive it.
 */
export async function extendLicense(subscription: Pick<SubscriptionDoc, "_id">, periodEnd: Date): Promise<void> {
  await License.updateOne(
    { subscription_id: subscription._id, status: "active" },
    { expires_at: toIsoDate(periodEnd), updated_at: new Date() },
  );
}

/** Plan changed at the provider (upgrade/downgrade): follow it on the Subscription and its License. */
export async function changePlan(subscription: SubscriptionDoc, product: string, plan: string, providerPriceId: string): Promise<void> {
  if (subscription.plan === plan && subscription.product === product) return;
  const licensePlan = await resolveLicensePlan(product, plan);
  if (!licensePlan) return;
  await Subscription.updateOne({ _id: subscription._id }, { product, plan, provider_price_id: providerPriceId, updated_at: new Date() });
  await License.updateOne(
    { subscription_id: subscription._id },
    { product, plan, activation_limit: licensePlan.activation_limit, updated_at: new Date() },
  );
}

/**
 * Full refund: the refund policy says the license is cancelled. The plugin's next
 * heartbeat sees status "cancelled" and drops the site to Free.
 */
export async function refundSubscription(subscription: Pick<SubscriptionDoc, "_id">): Promise<void> {
  const now = new Date();
  // Only the first refund (of the several paths and webhooks that report one) emails the customer.
  const before = await Subscription.findOneAndUpdate(
    { _id: subscription._id, status: { $ne: "cancelled" } },
    { status: "cancelled", cancelled_at: now, updated_at: now },
  );
  await License.updateMany({ subscription_id: subscription._id }, { status: "cancelled", updated_at: now });
  const user = before && (await User.findById(before.user_id));
  if (user) enqueueEmail("subscription-refunded", user.email, { name: user.name, plan: before.plan });
}

export const REFUND_WINDOW_DAYS = 7;

/**
 * The refund policy's 7-day full refund, as a date: until when this subscription can be refunded
 * from the dashboard, or null if it can't (not LS, too old, already refunded, or the customer
 * already had a refund for this product — the policy's repeat buy-and-refund clause).
 */
export async function refundEligibleUntil(subscription: SubscriptionDoc): Promise<Date | null> {
  if (subscription.provider !== "lemonsqueezy" || !subscription.provider_order_id || subscription.status === "cancelled") return null;
  const until = new Date(subscription.created_at.getTime() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (until < new Date()) return null;
  const refundedBefore = await Subscription.exists({
    _id: { $ne: subscription._id },
    user_id: subscription.user_id,
    product: subscription.product,
    status: "cancelled",
  });
  return refundedBefore ? null : until;
}

/** Full refund at Lemon Squeezy, cancel the license now, and stop the renewal. The refund webhooks that follow dedupe. */
export async function refundAndCancel(subscription: SubscriptionDoc): Promise<void> {
  await refundLsOrder(subscription.provider_order_id!);
  await refundSubscription(subscription);
  await lemonSqueezyProvider.cancelSubscription(subscription.provider_subscription_id).catch((err) => {
    // E.g. LS refuses to cancel an already-cancelled subscription; the license is cancelled either way.
    logger.warn({ err, subscription: subscription.provider_subscription_id }, "refund: couldn't cancel the subscription at Lemon Squeezy");
  });
}
