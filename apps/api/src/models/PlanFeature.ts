import { Schema, model, Types } from "mongoose";

export interface PlanFeatureDoc {
  _id: Types.ObjectId;
  plan_id: Types.ObjectId;
  feature_id: Types.ObjectId;
  enabled: boolean;
  note?: string; // display override, e.g. "Capped" for bulk_import on Free instead of a plain checkmark
}

const planFeatureSchema = new Schema<PlanFeatureDoc>({
  plan_id: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
  feature_id: { type: Schema.Types.ObjectId, ref: "Feature", required: true },
  enabled: { type: Boolean, required: true },
  note: String,
});

planFeatureSchema.index({ plan_id: 1, feature_id: 1 }, { unique: true });

export const PlanFeature = model<PlanFeatureDoc>("PlanFeature", planFeatureSchema);
