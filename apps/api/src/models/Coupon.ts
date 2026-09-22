import { Schema, model, Types } from "mongoose";
import type { MarketingPlanSlug } from "./Plan.js";

export type CouponType = "percentage" | "fixed_amount" | "free_trial" | "free_months";

export interface CouponDoc {
  _id: Types.ObjectId;
  code: string;
  // Stripe's own coupon/promotion-code id — we don't reimplement discount
  // math, we just point Stripe Checkout at this and track redemptions here.
  stripe_coupon_id: string;
  type: CouponType;
  value: number;
  max_redemptions?: number;
  redemption_count: number;
  expires_at?: Date;
  applicable_plans: MarketingPlanSlug[];
  status: "active" | "disabled";
  created_at: Date;
}

const couponSchema = new Schema<CouponDoc>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  stripe_coupon_id: { type: String, required: true },
  type: { type: String, enum: ["percentage", "fixed_amount", "free_trial", "free_months"], required: true },
  value: { type: Number, required: true },
  max_redemptions: Number,
  redemption_count: { type: Number, default: 0 },
  expires_at: Date,
  applicable_plans: { type: [String], default: ["pro", "business"] },
  status: { type: String, enum: ["active", "disabled"], default: "active" },
  created_at: { type: Date, default: Date.now },
});

export const Coupon = model<CouponDoc>("Coupon", couponSchema);
