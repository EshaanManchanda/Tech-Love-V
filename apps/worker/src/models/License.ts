import { Schema, model, Types } from "mongoose";

// Kept in sync by hand with apps/api/src/models/License.ts — only the fields
// this worker actually reads/writes. See User.ts for why it's duplicated
// instead of shared.
export interface LicenseDoc {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  plan: "pro" | "business";
  status: "active" | "expired" | "cancelled" | "suspended";
  expires_at: string;
  reminders_sent: number[];
}

const licenseSchema = new Schema<LicenseDoc>({
  user_id: { type: Schema.Types.ObjectId, ref: "User" },
  plan: String,
  status: String,
  expires_at: String,
  reminders_sent: { type: [Number], default: [] },
});

export const License = model<LicenseDoc>("License", licenseSchema, "licenses");
