import { Plan, type PlanDoc } from "../models/Plan.js";
import { Product } from "../models/Product.js";

export type BillingCycle = "monthly" | "yearly";
/** What the buyer picked on the pricing page. With Lemon Squeezy both are charged in USD; "inr" picks the India-priced variant. */
export type CheckoutCurrency = "usd" | "inr";

// Any product created in the admin Products CMS can be licensed: its Plan
// documents carry activation_limit, Stripe price ids and the key prefix.
// These legacy defaults only fill gaps for the three original paid plans, so
// DBs and deploys configured before that (Stripe prices in env vars, plans
// without those fields) keep working unchanged.
const LEGACY: Record<string, { product: string; activation_limit: number; key_prefix: string; price_env: Record<BillingCycle, string> }> = {
  pro: {
    product: "certificate-generator",
    activation_limit: 1,
    key_prefix: "PRO",
    price_env: { monthly: "STRIPE_PRICE_PRO_MONTHLY", yearly: "STRIPE_PRICE_PRO_YEARLY" },
  },
  business: {
    product: "certificate-generator",
    activation_limit: 5,
    key_prefix: "BIZ",
    price_env: { monthly: "STRIPE_PRICE_BUSINESS_MONTHLY", yearly: "STRIPE_PRICE_BUSINESS_YEARLY" },
  },
  paid: {
    product: "dynamic-tags",
    activation_limit: 1,
    key_prefix: "DT",
    price_env: { monthly: "STRIPE_PRICE_DT_PAID_MONTHLY", yearly: "STRIPE_PRICE_DT_PAID_YEARLY" },
  },
};

export interface LicensePlan {
  product: string; // product slug
  plan: string; // plan slug, unique within the product
  activation_limit: number;
  key_prefix: string;
  doc: PlanDoc | null;
}

function legacyFor(product: string, plan: string) {
  const legacy = LEGACY[plan];
  return legacy?.product === product ? legacy : undefined;
}

/** Older clients send only a plan slug — infer the product the way the platform always has. */
export function defaultProductForPlan(plan: string): string {
  return LEGACY[plan]?.product ?? "certificate-generator";
}

/** "my-new-plugin" → "MNP" — fallback key prefix when a plan doesn't set one. */
function initials(slug: string): string {
  return slug
    .split("-")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

/** The license-bearing plan of a product, or null if it doesn't exist / is free. */
export async function resolveLicensePlan(productSlug: string, planSlug: string): Promise<LicensePlan | null> {
  const product = await Product.findOne({ slug: productSlug }).lean();
  const doc = product ? await Plan.findOne({ product_id: product._id, slug: planSlug, status: "active" }).lean() : null;
  const legacy = legacyFor(productSlug, planSlug);
  if (!doc && !legacy) return null;
  if (doc?.billing_type === "free") return null; // the Free tier never has a license key

  return {
    product: productSlug,
    plan: planSlug,
    activation_limit: doc?.activation_limit || legacy?.activation_limit || 1,
    key_prefix: doc?.license_key_prefix || legacy?.key_prefix || initials(productSlug),
    doc,
  };
}

const LS_VARIANT_FIELDS = {
  monthly: { usd: "ls_variant_monthly_usd", inr: "ls_variant_monthly_inr" },
  yearly: { usd: "ls_variant_yearly_usd", inr: "ls_variant_yearly_inr" },
} as const satisfies Record<BillingCycle, Record<CheckoutCurrency, keyof PlanDoc>>;

/**
 * The id checkout needs: a Lemon Squeezy variant id (set per plan in Admin → Products; no env
 * fallback), or a Stripe price id. Stripe is USD-only here, so `currency` is ignored for it.
 */
export function priceIdFor(
  plan: LicensePlan,
  cycle: BillingCycle,
  provider: "stripe" | "lemonsqueezy" = "stripe",
  currency: CheckoutCurrency = "usd",
): string {
  if (provider === "lemonsqueezy") {
    const variant = plan.doc?.[LS_VARIANT_FIELDS[cycle][currency]];
    if (!variant) throw new Error(`No Lemon Squeezy ${cycle} ${currency} variant configured for ${plan.product}/${plan.plan}`);
    return String(variant);
  }
  const fromDoc = cycle === "monthly" ? plan.doc?.stripe_price_monthly : plan.doc?.stripe_price_yearly;
  if (fromDoc) return fromDoc;
  const envVar = legacyFor(plan.product, plan.plan)?.price_env[cycle];
  const value = envVar ? process.env[envVar] : undefined;
  if (!value) throw new Error(`No Stripe ${cycle} price configured for ${plan.product}/${plan.plan}`);
  return value;
}

/** Reverse lookup: which product/plan (and cycle) does a Stripe price id or Lemon Squeezy variant id belong to? */
export async function planForPriceId(priceId: string): Promise<{ product: string; plan: string; cycle?: BillingCycle } | null> {
  const lsFields = Object.values(LS_VARIANT_FIELDS).flatMap((byCurrency) => Object.values(byCurrency));
  const doc = await Plan.findOne({
    $or: [{ stripe_price_monthly: priceId }, { stripe_price_yearly: priceId }, ...lsFields.map((field) => ({ [field]: priceId }))],
  }).lean();
  if (doc) {
    const product = await Product.findById(doc.product_id).lean();
    const yearly = doc.stripe_price_yearly === priceId || Object.values(LS_VARIANT_FIELDS.yearly).some((field) => doc[field] === priceId);
    if (product) return { product: product.slug, plan: doc.slug, cycle: yearly ? "yearly" : "monthly" };
  }
  for (const [plan, legacy] of Object.entries(LEGACY)) {
    if (Object.values(legacy.price_env).some((envVar) => process.env[envVar] === priceId)) return { product: legacy.product, plan };
  }
  return null;
}
