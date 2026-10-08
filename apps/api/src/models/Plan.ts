import { Schema, model, Types } from "mongoose";

// Plan slugs are free-form and only unique within a product, so a new product
// can define its own tiers. "free" billing_type plans never get a License.
export type MarketingPlanSlug = string;

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
  stripe_price_monthly?: string; // Stripe price ids for checkout; unset → legacy env vars (config/plans.ts)
  stripe_price_yearly?: string;
  license_key_prefix?: string; // e.g. "PRO" → PRO-XXXX-…; unset → legacy prefix or product initials
  cta_label: string;
  cta_type: "register" | "checkout" | "contact";
  highlighted: boolean;
  sort_order: number;
  status: "active" | "archived";
}

const planSchema = new Schema<PlanDoc>({
  product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  billing_type: { type: String, enum: ["free", "recurring", "contact"], required: true },
  price_monthly: { type: Number, default: null },
  price_yearly: { type: Number, default: null },
  price_note: String,
  currency: { type: String, default: "usd" },
  cert_limit: { type: Number, required: true },
  bulk_cap: { type: Number, required: true },
  activation_limit: { type: Number, default: 0 },
  stripe_price_monthly: String,
  stripe_price_yearly: String,
  license_key_prefix: { type: String, uppercase: true, trim: true },
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
