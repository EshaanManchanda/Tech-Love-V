import { Schema, model, Types } from "mongoose";

export interface ActivationDoc {
  _id: Types.ObjectId;
  license_id: Types.ObjectId;
  site_url: string;
  activated_at: Date;
  last_check_at: Date;
  last_usage_count?: number;
  // Only set for trial-type licenses (activation_at + trial_duration_days,
  // computed once on first activation). Left unset for standard pro/business
  // licenses, which keep using License.expires_at as the single source of truth.
  expires_at?: Date;
  // Richer identification fields from the MERN plan's Activation model. The
  // plugin's CG_License_Manager::remote_validate() only ever sends
  // {license_key, site_url} today, so site_id/site_hash/wordpress_version/
  // plugin_version stay null until a coordinated plugin-side change starts
  // sending them — modeled here so the API is forward-compatible. `ip` is
  // real today, captured server-side from the request.
  site_id?: string;
  site_hash?: string;
  wordpress_version?: string;
  plugin_version?: string;
  ip?: string;
}

const activationSchema = new Schema<ActivationDoc>({
  license_id: { type: Schema.Types.ObjectId, ref: "License", required: true },
  site_url: { type: String, required: true },
  activated_at: { type: Date, default: Date.now },
  last_check_at: { type: Date, default: Date.now },
  last_usage_count: Number,
  expires_at: Date,
  site_id: String,
  site_hash: String,
  wordpress_version: String,
  plugin_version: String,
  ip: String,
});

activationSchema.index({ license_id: 1, site_url: 1 }, { unique: true });

export const Activation = model<ActivationDoc>("Activation", activationSchema);
