import { createHash } from "node:crypto";
import { FeatureFlag } from "../models/FeatureFlag.js";

export interface FeatureFlagContext {
  userId?: string;
  organizationId?: string;
  plan?: string;
}

/** Stable per-(flag,user) bucket in [0, 100) so a user's rollout bucket never flips between checks. */
function bucketFor(key: string, userId: string): number {
  const hash = createHash("sha256").update(`${key}:${userId}`).digest();
  return hash.readUInt32BE(0) % 100;
}

export async function isFeatureEnabled(key: string, context: FeatureFlagContext = {}): Promise<boolean> {
  const flag = await FeatureFlag.findOne({ key });
  if (!flag || !flag.enabled) return false;

  switch (flag.target_type) {
    case "everyone":
      return true;
    case "plan":
      return !!context.plan && flag.target_plans.includes(context.plan);
    case "user":
      return !!context.userId && flag.target_user_ids.some((id) => id.toString() === context.userId);
    case "organization":
      return !!context.organizationId && flag.target_organization_ids.some((id) => id.toString() === context.organizationId);
    case "percentage":
      return !!context.userId && bucketFor(key, context.userId) < (flag.rollout_percentage ?? 0);
    default:
      return false;
  }
}
