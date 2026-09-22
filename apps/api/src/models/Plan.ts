import { Schema, model, Types } from "mongoose";

// All three marketing tiers, including "free" — which has no matching License
// document (apps/api/src/config/plans.ts's PlanSlug only covers the two
// license-bearing tiers). This type is for the website's pricing display only.
export type MarketingPlanSlug = "free" | "pro" | "business" | "paid";

export interface PlanDoc {
  _id: Types.ObjectId;
  product_id: Types.ObjectId;
  slug: MarketingPlanSlug;
  name: string;
  billing_type: "free" | "recurring" | "contact";
  price_monthly: number | null;
  price_yearly: number | null;
  price_note?: string; // e.g. "Contact for pricing"
  currency: string;
  cert_limit: number; // certificates/month; 0 = unlimited (mirrors plugin's CG_License_Manager::LIMITS)
  bulk_cap: number; // bulk import/export row cap; 0 = unlimited
  activation_limit: number; // sites a license can activate; 0 = n/a (free has no license)
  cta_label: string;
  cta_type: "register" | "checkout" | "contact";
  highlighted: boolean;
  sort_order: number;
  status: "active" | "archived";
}

const planSchema = new Schema<PlanDoc>({
  product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  slug: { type: String, enum: ["free", "pro", "business", "paid"], required: true },
  name: { type: String, required: true },
  billing_type: { type: String, enum: ["free", "recurring", "contact"], required: true },
  price_monthly: { type: Number, default: null },
  price_yearly: { type: Number, default: null },
  price_note: String,
  currency: { type: String, default: "usd" },
  cert_limit: { type: Number, required: true },
  bulk_cap: { type: Number, required: true },
  activation_limit: { type: Number, default: 0 },
  cta_label: { type: String, required: true },
  cta_type: { type: String, enum: ["register", "checkout", "contact"], required: true },
  highlighted: { type: Boolean, default: false },
  sort_order: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "archived"], default: "active" },
});

// Slugs only need to be unique within a product — Plan.product_id already
// scopes this, so a second product can reuse "free" etc. without colliding.
planSchema.index({ product_id: 1, slug: 1 }, { unique: true });

export const Plan = model<PlanDoc>("Plan", planSchema);
