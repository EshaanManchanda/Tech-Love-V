import { Schema, model, Types } from "mongoose";

export type FeatureFlagTargetType = "everyone" | "plan" | "user" | "organization" | "percentage";

export interface FeatureFlagDoc {
  _id: Types.ObjectId;
  key: string;
  description?: string;
  enabled: boolean;
  target_type: FeatureFlagTargetType;
  target_plans: string[]; // used when target_type === "plan"
  target_user_ids: Types.ObjectId[]; // used when target_type === "user"
  target_organization_ids: Types.ObjectId[]; // used when target_type === "organization"
  rollout_percentage?: number; // used when target_type === "percentage", 0-100
  created_at: Date;
}

const featureFlagSchema = new Schema<FeatureFlagDoc>({
  key: { type: String, required: true, unique: true },
  description: String,
  enabled: { type: Boolean, default: false },
  target_type: { type: String, enum: ["everyone", "plan", "user", "organization", "percentage"], default: "everyone" },
  target_plans: { type: [String], default: [] },
  target_user_ids: { type: [Schema.Types.ObjectId], default: [] },
  target_organization_ids: { type: [Schema.Types.ObjectId], default: [] },
  rollout_percentage: Number,
  created_at: { type: Date, default: Date.now },
});

export const FeatureFlag = model<FeatureFlagDoc>("FeatureFlag", featureFlagSchema);
