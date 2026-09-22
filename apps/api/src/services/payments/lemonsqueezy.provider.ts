import type { PaymentProvider } from "./PaymentProvider.js";

/**
 * Scaffold only (MERN plan §42/§149) — not implemented yet. Our own database
 * stays the license/plan source of truth even if this is wired up later
 * (see doc's "Important Design Decision" — never let a payment provider's
 * license-key feature become the source of truth).
 */
export const lemonSqueezyProvider: PaymentProvider = new Proxy({} as PaymentProvider, {
  get() {
    throw new Error("Lemon Squeezy provider is not implemented yet — Stripe is the only live payment provider.");
  },
});
