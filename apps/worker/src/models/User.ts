import { Schema, model, Types } from "mongoose";

// Kept in sync by hand with apps/api/src/models/User.ts — a shared `packages/types`
// would remove this duplication; deferred until more than two consumers need it.
export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

const userSchema = new Schema<UserDoc>({
  name: String,
  email: String,
});

export const User = model<UserDoc>("User", userSchema, "users");
