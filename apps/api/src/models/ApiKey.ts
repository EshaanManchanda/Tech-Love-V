import { Schema, model, Types } from "mongoose";

export interface ApiKeyDoc {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  organization_id?: Types.ObjectId;
  name: string;
  key_prefix: string; // first 8 chars shown in the UI so the user can tell keys apart, e.g. "cgsk_a1b2"
  key_hash: string; // sha256 — the raw key is shown exactly once at creation and never stored
  last_used_at?: Date;
  expires_at?: Date;
  revoked_at?: Date;
  created_at: Date;
}

const apiKeySchema = new Schema<ApiKeyDoc>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization_id: { type: Schema.Types.ObjectId, ref: "Organization" },
  name: { type: String, required: true },
  key_prefix: { type: String, required: true },
  key_hash: { type: String, required: true, unique: true },
  last_used_at: Date,
  expires_at: Date,
  revoked_at: Date,
  created_at: { type: Date, default: Date.now },
});

export const ApiKey = model<ApiKeyDoc>("ApiKey", apiKeySchema);
