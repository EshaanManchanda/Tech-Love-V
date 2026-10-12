import type { BillingCycle } from "../../models/Subscription.js";

export interface CreateCheckoutParams {
  userId: string;
  email: string;
  /** This user's customer id at the provider, if they already have one. */
  providerCustomerId?: string;
  priceId: string; // Stripe price id or Lemon Squeezy variant id — resolve with config/plans.ts priceIdFor() before calling
  cycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
  /** Provider-native coupon (a Stripe Coupon id, or a Lemon Squeezy discount code) — resolve our own Coupon.code to this before calling. */
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
 * directly outside this folder (MERN plan §39/§149). Stripe and Lemon Squeezy
 * are live; index.ts picks one from PAYMENT_PROVIDER. Razorpay is scaffolded only.
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
