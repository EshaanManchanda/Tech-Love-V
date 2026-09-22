import { Schema, model, Types } from "mongoose";

export type OrgRole = "owner" | "admin" | "billing_manager" | "developer" | "support";

export interface OrganizationMember {
  user_id: Types.ObjectId;
  role: OrgRole;
}

export interface OrganizationDoc {
  _id: Types.ObjectId;
  name: string;
  owner_id: Types.ObjectId;
  members: OrganizationMember[];
  created_at: Date;
}

const memberSchema = new Schema<OrganizationMember>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "admin", "billing_manager", "developer", "support"], required: true },
  },
  { _id: false },
);

const organizationSchema = new Schema<OrganizationDoc>({
  name: { type: String, required: true },
  owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  members: { type: [memberSchema], default: [] },
  created_at: { type: Date, default: Date.now },
});

export const Organization = model<OrganizationDoc>("Organization", organizationSchema);
