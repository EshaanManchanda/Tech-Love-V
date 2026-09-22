import { Router } from "express";
import { Plan, type MarketingPlanSlug } from "../models/Plan.js";
import { Feature } from "../models/Feature.js";
import { PlanFeature } from "../models/PlanFeature.js";
import { Product } from "../models/Product.js";

export const plansRouter = Router();

async function resolveProductId(req: { query: { product?: unknown } }) {
  const slug = typeof req.query.product === "string" ? req.query.product : "certificate-generator";
  const product = await Product.findOne({ slug });
  return product?._id;
}

function certLimitLabel(n: number): string {
  return n === 0 ? "Unlimited" : `${n.toLocaleString()}/mo`;
}

function bulkCapLabel(n: number): string {
  return n === 0 ? "Unlimited" : `${n.toLocaleString()} rows`;
}

function toPlanCopy(plan: InstanceType<typeof Plan>) {
  return {
    slug: plan.slug,
    label: plan.name,
    priceMonthly: plan.price_monthly,
    priceYearly: plan.price_yearly,
    priceNote: plan.price_note,
    certLimit: certLimitLabel(plan.cert_limit),
    bulkCap: bulkCapLabel(plan.bulk_cap),
    cta: { label: plan.cta_label, type: plan.cta_type },
    highlight: plan.highlighted || undefined,
  };
}

plansRouter.get("/", async (req, res) => {
  const productId = await resolveProductId(req);
  const plans = await Plan.find({ status: "active", product_id: productId }).sort({ sort_order: 1 });
  res.json(plans.map(toPlanCopy));
});

plansRouter.get("/compare", async (req, res) => {
  const productId = await resolveProductId(req);
  const plans = await Plan.find({ status: "active", product_id: productId }).sort({ sort_order: 1 });
  const planFeatures = await PlanFeature.find({ plan_id: { $in: plans.map((p) => p._id) } });

  // Feature is a global collection shared by every product's PlanFeature rows —
  // scope the comparison to only features actually wired up for this product's
  // plans, not every feature that exists across the whole catalog.
  const featureIds = [...new Set(planFeatures.map((pf) => pf.feature_id.toString()))];
  const features = await Feature.find({ _id: { $in: featureIds } }).sort({ sort_order: 1 });

  const bySlugAndFeature = new Map<string, (typeof planFeatures)[number]>();
  for (const pf of planFeatures) {
    bySlugAndFeature.set(`${pf.plan_id.toString()}:${pf.feature_id.toString()}`, pf);
  }

  const featureRows = features.map((f) => {
    const row: Record<string, boolean | string> & { key: string; label: string } = { key: f.key, label: f.label };
    for (const plan of plans) {
      const pf = bySlugAndFeature.get(`${plan._id.toString()}:${f._id.toString()}`);
      row[plan.slug] = pf?.note ?? pf?.enabled ?? false;
    }
    return row;
  });

  res.json({ plans: plans.map(toPlanCopy), features: featureRows });
});

plansRouter.get("/:slug", async (req, res) => {
  const productId = await resolveProductId(req);
  const plan = await Plan.findOne({ slug: req.params.slug as MarketingPlanSlug, status: "active", product_id: productId });
  if (!plan) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found." } });
  res.json(toPlanCopy(plan));
});
