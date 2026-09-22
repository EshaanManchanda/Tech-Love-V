import { Schema, model, Types } from "mongoose";
import type { PlanSlug } from "../config/plans.js";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "paused" | "cancelled" | "expired" | "unpaid";
export type BillingCycle = "monthly" | "yearly";

export interface SubscriptionDoc {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  organization_id?: Types.ObjectId;
  plan: PlanSlug;
  provider: "stripe";
  provider_subscription_id: string;
  provider_price_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  cancelled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const subscriptionSchema = new Schema<SubscriptionDoc>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization_id: { type: Schema.Types.ObjectId, ref: "Organization" },
  plan: { type: String, enum: ["pro", "business"], required: true },
  provider: { type: String, enum: ["stripe"], default: "stripe" },
  provider_subscription_id: { type: String, required: true, unique: true },
  provider_price_id: { type: String, required: true },
  status: {
    type: String,
    enum: ["trialing", "active", "past_due", "paused", "cancelled", "expired", "unpaid"],
    default: "active",
  },
  billing_cycle: { type: String, enum: ["monthly", "yearly"], required: true },
  current_period_start: { type: Date, required: true },
  current_period_end: { type: Date, required: true },
  cancel_at_period_end: { type: Boolean, default: false },
  cancelled_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const Subscription = model<SubscriptionDoc>("Subscription", subscriptionSchema);
