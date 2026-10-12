import type { PaymentProvider } from "./PaymentProvider.js";
import { lemonSqueezyProvider } from "./lemonsqueezy.provider.js";
import { stripeProvider } from "./stripe.provider.js";

export type ProviderName = "stripe" | "lemonsqueezy";

/**
 * Which provider new checkouts and the billing portal use. Both webhooks stay
 * mounted whatever this says, so subscriptions started on the other provider
 * keep syncing and switching back is a config change.
 */
export function activeProviderName(): ProviderName {
  return process.env.PAYMENT_PROVIDER === "lemonsqueezy" ? "lemonsqueezy" : "stripe";
}

export function getPaymentProvider(name: ProviderName = activeProviderName()): PaymentProvider {
  return name === "lemonsqueezy" ? lemonSqueezyProvider : stripeProvider;
}
