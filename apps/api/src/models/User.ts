import { Schema, model } from "mongoose";

export interface UserDoc {
  _id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "customer" | "admin";
  stripe_customer_id?: string;
  created_at: Date;
}

const userSchema = new Schema<UserDoc>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  stripe_customer_id: String,
  created_at: { type: Date, default: Date.now },
});

export const User = model<UserDoc>("User", userSchema);
