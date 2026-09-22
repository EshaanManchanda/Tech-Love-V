import { priceIdFor, stripe } from "../stripeClient.js";
import type { CreateCheckoutParams, PaymentProvider, ProviderSubscription } from "./PaymentProvider.js";

function toProviderSubscription(sub: {
  id: string;
  status: string;
  items: { data: { price: { id: string } }[] };
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}): ProviderSubscription {
  return {
    id: sub.id,
    status: sub.status,
    priceId: sub.items.data[0]?.price.id ?? "",
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

export const stripeProvider: PaymentProvider = {
  async createCheckout(params: CreateCheckoutParams) {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: params.userId,
      customer_email: params.stripeCustomerId ? undefined : params.email,
      customer: params.stripeCustomerId,
      line_items: [{ price: priceIdFor(params.plan, params.cycle), quantity: 1 }],
      ...(params.providerCouponId ? { discounts: [{ coupon: params.providerCouponId }] } : { allow_promotion_codes: true }),
      metadata: params.metadata,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    return { url: session.url! };
  },

  async createCustomer(email: string) {
    const customer = await stripe.customers.create({ email });
    return { id: customer.id };
  },

  async createPortal(customerId: string, returnUrl: string) {
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return { url: session.url };
  },

  async getSubscription(subscriptionId: string) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return toProviderSubscription(sub);
  },

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true) {
    if (atPeriodEnd) {
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    } else {
      await stripe.subscriptions.cancel(subscriptionId);
    }
  },

  async resumeSubscription(subscriptionId: string) {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
  },

  async upgradeSubscription(subscriptionId: string, newPriceId: string) {
    const current = await stripe.subscriptions.retrieve(subscriptionId);
    const sub = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: current.items.data[0].id, price: newPriceId }],
      proration_behavior: "create_prorations",
    });
    return toProviderSubscription(sub);
  },

  async downgradeSubscription(subscriptionId: string, newPriceId: string) {
    const current = await stripe.subscriptions.retrieve(subscriptionId);
    const sub = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: current.items.data[0].id, price: newPriceId }],
      proration_behavior: "none",
    });
    return toProviderSubscription(sub);
  },

  verifyWebhook(rawBody: Buffer | string, signature: string) {
    return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  },
};
