import type { PaymentProvider } from "./PaymentProvider.js";

/**
 * Scaffold only (MERN plan §44/§149) — Razorpay is Phase 2 of the payment
 * rollout (India-focused), not implemented yet. Wire up with the `razorpay`
 * SDK when that phase is actually scoped; until then this throws so a
 * misconfiguration fails loudly instead of silently doing nothing.
 */
export const razorpayProvider: PaymentProvider = new Proxy({} as PaymentProvider, {
  get() {
    throw new Error("Razorpay provider is not implemented yet — Stripe is the only live payment provider.");
  },
});
