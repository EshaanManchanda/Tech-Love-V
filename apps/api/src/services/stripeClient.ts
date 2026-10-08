import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

export type { BillingCycle } from "../config/plans.js";
// Stripe price ⇄ plan mapping lives in config/plans.ts (priceIdFor / planForPriceId),
// backed by each Plan document's stripe_price_* fields.
