import { Schema, model, Types } from "mongoose";
import type { PlanSlug } from "../config/plans.js";

export type LicenseStatus = "active" | "expired" | "cancelled" | "suspended";

export interface LicenseDoc {
  _id: Types.ObjectId;
  license_key: string;
  user_id: Types.ObjectId;
  organization_id?: Types.ObjectId;
  subscription_id?: Types.ObjectId;
  product: "certificate-generator" | "dynamic-tags";
  plan: PlanSlug;
  status: LicenseStatus;
  activation_limit: number;
  expires_at: string; // "YYYY-MM-DD" — matches the WP plugin's gmdate('Y-m-d') round-trip
  // "trial": no single expires_at is meaningful — each site's Activation carries
  // its own expires_at, set to activation date + trial_duration_days on first
  // activation (see licenseService.activateSite). expires_at above is set to a
  // far-future placeholder for trial licenses so legacy isExpired() never trips.
  license_type?: "standard" | "trial";
  trial_duration_days?: number;
  flagged?: boolean; // set when ActivationService detects suspicious activation activity
  reminders_sent?: number[]; // renewal-reminder day-offsets already emailed (30/14/7/3/1) — see apps/worker
  // Negotiated per-business overrides set at manual issuance (see routes/admin.ts).
  // Informational only today — the WP plugin's own feature gating still reads a
  // hardcoded plan slug, not these values (its source lives outside this repo).
  custom_terms?: { cert_limit?: number; bulk_cap?: number; price_note?: string };
  metadata?: Record<string, unknown>;
  // Legacy direct Stripe refs — kept as a fallback lookup for licenses issued
  // before the Subscription model existed. New code should go through
  // subscription_id / the Subscription collection instead.
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  created_at: Date;
  updated_at: Date;
}

const licenseSchema = new Schema<LicenseDoc>({
  license_key: { type: String, required: true, unique: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization_id: { type: Schema.Types.ObjectId, ref: "Organization" },
  subscription_id: { type: Schema.Types.ObjectId, ref: "Subscription" },
  product: { type: String, enum: ["certificate-generator", "dynamic-tags"], default: "certificate-generator", required: true },
  plan: { type: String, enum: ["pro", "business", "paid"], required: true },
  status: { type: String, enum: ["active", "expired", "cancelled", "suspended"], default: "active" },
  activation_limit: { type: Number, required: true },
  expires_at: { type: String, required: true },
  license_type: { type: String, enum: ["standard", "trial"], default: "standard" },
  trial_duration_days: { type: Number },
  flagged: { type: Boolean, default: false },
  reminders_sent: { type: [Number], default: [] },
  custom_terms: {
    cert_limit: Number,
    bulk_cap: Number,
    price_note: String,
  },
  metadata: { type: Schema.Types.Mixed },
  stripe_subscription_id: String,
  stripe_price_id: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const License = model<LicenseDoc>("License", licenseSchema);
