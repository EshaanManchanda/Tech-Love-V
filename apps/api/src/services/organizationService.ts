import type { Types } from "mongoose";
import { Organization, type OrganizationDoc } from "../models/Organization.js";

/** Every user gets exactly one owned org at registration — this is that org. */
export async function createPersonalOrganization(userId: Types.ObjectId | string, userName: string): Promise<OrganizationDoc> {
  return Organization.create({
    name: `${userName}'s Organization`,
    owner_id: userId,
    members: [{ user_id: userId, role: "owner" }],
  });
}

/** The org a user's licenses/subscriptions attribute to when none is specified — their oldest owned org. */
export async function findPrimaryOrganization(userId: Types.ObjectId | string): Promise<OrganizationDoc | null> {
  return Organization.findOne({ owner_id: userId }).sort({ created_at: 1 });
}
