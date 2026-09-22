import type { PlanSlug } from "../../config/plans.js";
import type { BillingCycle } from "../../models/Subscription.js";

export interface CreateCheckoutParams {
  userId: string;
  email: string;
  stripeCustomerId?: string;
  plan: PlanSlug;
  cycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
  /** Provider-native coupon id (e.g. a Stripe Coupon id) — resolve our own Coupon.code to this before calling. */
  providerCouponId?: string;
  metadata?: Record<string, string>;
}

export interface ProviderSubscription {
  id: string;
  status: string;
  priceId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Abstraction over the billing backend so the API never calls a provider SDK
 * directly outside this folder (MERN plan §39/§149). Stripe is the only live
 * implementation today — see stripe.provider.ts. Razorpay/LemonSqueezy are
 * scaffolded (interface-only) for a later, separately-scoped phase.
 */
export interface PaymentProvider {
  createCheckout(params: CreateCheckoutParams): Promise<{ url: string }>;
  createCustomer(email: string): Promise<{ id: string }>;
  createPortal(customerId: string, returnUrl: string): Promise<{ url: string }>;
  getSubscription(subscriptionId: string): Promise<ProviderSubscription>;
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;
  upgradeSubscription(subscriptionId: string, newPriceId: string): Promise<ProviderSubscription>;
  downgradeSubscription(subscriptionId: string, newPriceId: string): Promise<ProviderSubscription>;
  verifyWebhook(rawBody: Buffer | string, signature: string): unknown;
}
