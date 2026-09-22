import { Schema, model, Types } from "mongoose";

export interface FeatureDoc {
  _id: Types.ObjectId;
  key: string; // matches CG_License_Manager::get_plan_features() keys, e.g. "bulk_zip"
  label: string;
  category?: string;
  sort_order: number;
}

const featureSchema = new Schema<FeatureDoc>({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  category: String,
  sort_order: { type: Number, default: 0 },
});

export const Feature = model<FeatureDoc>("Feature", featureSchema);
