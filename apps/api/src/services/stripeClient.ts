import Stripe from "stripe";
import type { PlanSlug } from "../config/plans.js";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

export type BillingCycle = "monthly" | "yearly";

const PRICE_ENV: Record<PlanSlug, Record<BillingCycle, string>> = {
  pro: { monthly: "STRIPE_PRICE_PRO_MONTHLY", yearly: "STRIPE_PRICE_PRO_YEARLY" },
  business: { monthly: "STRIPE_PRICE_BUSINESS_MONTHLY", yearly: "STRIPE_PRICE_BUSINESS_YEARLY" },
  paid: { monthly: "STRIPE_PRICE_DT_PAID_MONTHLY", yearly: "STRIPE_PRICE_DT_PAID_YEARLY" },
};

export function priceIdFor(plan: PlanSlug, cycle: BillingCycle): string {
  const envVar = PRICE_ENV[plan][cycle];
  const value = process.env[envVar];
  if (!value) throw new Error(`Missing env var ${envVar}`);
  return value;
}

/** Reverse lookup: given a Stripe price id, which plan does it belong to? */
export function planForPriceId(priceId: string): PlanSlug | null {
  for (const plan of Object.keys(PRICE_ENV) as PlanSlug[]) {
    for (const cycle of Object.keys(PRICE_ENV[plan]) as BillingCycle[]) {
      if (process.env[PRICE_ENV[plan][cycle]] === priceId) return plan;
    }
  }
  return null;
}
