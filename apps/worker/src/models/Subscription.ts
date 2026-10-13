import { Schema, model } from "mongoose";

// Kept in sync by hand with apps/api/src/models/Subscription.ts — only the fields
// this worker reads. See User.ts for why it's duplicated instead of shared.
export interface SubscriptionDoc {
  status: string;
  cancel_at_period_end: boolean;
}

const subscriptionSchema = new Schema<SubscriptionDoc>({
  status: String,
  cancel_at_period_end: Boolean,
});

export const Subscription = model<SubscriptionDoc>("Subscription", subscriptionSchema, "subscriptions");
