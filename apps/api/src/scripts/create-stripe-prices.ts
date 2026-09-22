/**
 * One-off setup script: creates (or reuses) the Stripe Products + Prices for
 * every self-serve plan across both products, then prints the .env lines to
 * paste in. Idempotent — looks up existing product/price by metadata/lookup
 * key before creating, so it's safe to re-run.
 *
 * Usage: STRIPE_SECRET_KEY=sk_test_... npx tsx src/scripts/create-stripe-prices.ts
 */
import "dotenv/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

async function findOrCreateProduct(slug: string, name: string): Promise<Stripe.Product> {
  const existing = await stripe.products.search({ query: `metadata['slug']:'${slug}'` });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({ name, metadata: { slug } });
}

async function findOrCreatePrice(productId: string, unitAmount: number, interval: "month" | "year", lookupKey: string) {
  const existing = await stripe.prices.list({ product: productId, active: true });
  const match = existing.data.find((p) => p.lookup_key === lookupKey);
  if (match) return match;
  return stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
  });
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not set — aborting (this script creates real Stripe objects).");
    process.exit(1);
  }

  const cgProduct = await findOrCreateProduct("certificate-generator-pro", "Certificate Generator — Pro");
  const cgMonthly = await findOrCreatePrice(cgProduct.id, 350, "month", "cg-pro-monthly-3-5usd");
  const cgYearly = await findOrCreatePrice(cgProduct.id, 3500, "year", "cg-pro-yearly-35usd");

  const dtProduct = await findOrCreateProduct("dynamic-tags-paid", "Dynamic Tags — Paid");
  const dtMonthly = await findOrCreatePrice(dtProduct.id, 200, "month", "dt-paid-monthly-2usd");
  const dtYearly = await findOrCreatePrice(dtProduct.id, 1900, "year", "dt-paid-yearly-19usd");

  console.log("\nAdd these to apps/api/.env:\n");
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${cgMonthly.id}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${cgYearly.id}`);
  console.log(`STRIPE_PRICE_DT_PAID_MONTHLY=${dtMonthly.id}`);
  console.log(`STRIPE_PRICE_DT_PAID_YEARLY=${dtYearly.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
