import { randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import type { PlanSlug } from "../config/plans.js";
import { License, type LicenseDoc } from "../models/License.js";
import { Activation } from "../models/Activation.js";
import { Plan } from "../models/Plan.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { findPrimaryOrganization } from "./organizationService.js";

// Matches the plugin's documented offline-fallback contract (PLAN-COMPARISON.md
// "License keys (local/offline fallback)") — Pro/Business keys are recognizable
// by prefix even if a plugin install ever falls back to local validation.
const KEY_PREFIX: Record<PlanSlug, string> = {
  pro: "PRO",
  business: "BIZ",
  paid: "DT",
};

export function generateLicenseKey(plan: PlanSlug): string {
  const group = () => randomBytes(2).toString("hex").toUpperCase();
  return `${KEY_PREFIX[plan]}-${group()}-${group()}-${group()}-${group()}`;
}

export function isExpired(license: Pick<LicenseDoc, "expires_at">): boolean {
  return license.expires_at < todayIsoDate();
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Same physical site shouldn't burn two activation seats over an http->https or www. change. */
export function normalizeSiteUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

export interface PlanLimits {
  activation_limit: number;
  cert_limit: number; // certificates/month; 0 = unlimited
  bulk_cap: number; // bulk import/export row cap; 0 = unlimited
}

/** Merges the marketing Plan's defaults with any per-license custom_terms override (see routes/admin.ts). */
export async function effectiveLimits(license: Pick<LicenseDoc, "plan" | "activation_limit" | "custom_terms">): Promise<PlanLimits> {
  const planDefaults = await Plan.findOne({ slug: license.plan }).lean();
  return {
    activation_limit: license.activation_limit,
    cert_limit: license.custom_terms?.cert_limit ?? planDefaults?.cert_limit ?? 0,
    bulk_cap: license.custom_terms?.bulk_cap ?? planDefaults?.bulk_cap ?? 0,
  };
}

export type ValidationResult =
  | { valid: false; status: "invalid"; message: string }
  | { valid: false; status: "suspended" | "cancelled" | "expired"; message: string }
  | { valid: true; status: "active"; plan: LicenseDoc["plan"]; expiry?: string; limits: PlanLimits };

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Trial licenses have no single expires_at — each site's own Activation.expires_at
 * (set on first activation, see activateSite) is the deadline. Without a siteUrl
 * (e.g. a bare key-validity ping) there's no per-site answer, so just report the
 * key itself isn't suspended/cancelled.
 */
async function checkTrialLicense(license: LicenseDoc, siteUrl: string | undefined, limits: PlanLimits): Promise<ValidationResult> {
  if (!siteUrl) {
    return { valid: true, status: "active", plan: license.plan, limits };
  }
  const activation = await Activation.findOne({ license_id: license._id, site_url: normalizeSiteUrl(siteUrl) });
  if (!activation?.expires_at) {
    return { valid: true, status: "active", plan: license.plan, limits };
  }
  if (activation.expires_at < new Date()) {
    return { valid: false, status: "expired", message: "Trial period for this site has ended." };
  }
  return { valid: true, status: "active", plan: license.plan, expiry: activation.expires_at.toISOString().slice(0, 10), limits };
}

/** Read-only check: does this license key represent a currently-usable license? No DB writes.
 *  siteUrl is only consulted for trial licenses, where expiry is tracked per-site. */
export async function checkLicense(licenseKey: string, siteUrl?: string): Promise<{ license: LicenseDoc | null; result: ValidationResult }> {
  const license = await License.findOne({ license_key: licenseKey });

  if (!license) {
    return { license: null, result: { valid: false, status: "invalid", message: "Invalid license key." } };
  }

  if (license.status === "suspended" || license.status === "cancelled") {
    return { license, result: { valid: false, status: license.status, message: `License is ${license.status}.` } };
  }

  const limits = await effectiveLimits(license);

  if (license.license_type === "trial") {
    return { license, result: await checkTrialLicense(license, siteUrl, limits) };
  }

  if (isExpired(license)) {
    return { license, result: { valid: false, status: "expired", message: "License has expired." } };
  }

  return {
    license,
    result: { valid: true, status: "active", plan: license.plan, expiry: license.expires_at, limits },
  };
}

export type ActivateResult = ValidationResult | { valid: false; status: "active"; message: string };

const SUSPICIOUS_WINDOW_MS = 10 * 60 * 1000;
const SUSPICIOUS_THRESHOLD = 5;

/** MERN plan §73: flag a license after too many activations in a short window (plain Mongo query, no Redis needed). */
async function flagIfSuspicious(licenseId: Types.ObjectId): Promise<void> {
  const since = new Date(Date.now() - SUSPICIOUS_WINDOW_MS);
  const recentCount = await Activation.countDocuments({ license_id: licenseId, activated_at: { $gte: since } });
  if (recentCount >= SUSPICIOUS_THRESHOLD) {
    await License.updateOne({ _id: licenseId }, { flagged: true });
  }
}

/** Activates (or re-touches) a site against a license. Enforces activation_limit. */
export async function activateSite(licenseKey: string, siteUrl: string, meta: { ip?: string } = {}): Promise<ActivateResult> {
  const { license, result } = await checkLicense(licenseKey, siteUrl);
  if (!license || !result.valid) return result;

  const normalizedUrl = normalizeSiteUrl(siteUrl);
  const existing = await Activation.findOne({ license_id: license._id, site_url: normalizedUrl });
  if (existing) {
    existing.last_check_at = new Date();
    if (meta.ip) existing.ip = meta.ip;
    await existing.save();
    return result;
  }

  const activeCount = await Activation.countDocuments({ license_id: license._id });
  if (activeCount >= license.activation_limit) {
    return {
      valid: false,
      status: "active",
      message: `Activation limit reached (${license.activation_limit} site${license.activation_limit === 1 ? "" : "s"}). Deactivate a site first.`,
    };
  }

  const isTrial = license.license_type === "trial";
  const siteExpiresAt = isTrial ? addDays(new Date(), license.trial_duration_days ?? 180) : undefined;
  await Activation.create({ license_id: license._id, site_url: normalizedUrl, ip: meta.ip, expires_at: siteExpiresAt });
  await flagIfSuspicious(license._id);

  return siteExpiresAt ? { ...result, expiry: siteExpiresAt.toISOString().slice(0, 10) } : result;
}

export async function deactivateSite(licenseKey: string, siteUrl: string): Promise<{ success: boolean }> {
  const license = await License.findOne({ license_key: licenseKey });
  if (!license) return { success: true }; // nothing to deactivate — respond success either way (matches plugin's fire-and-forget expectations)

  await Activation.deleteOne({ license_id: license._id, site_url: normalizeSiteUrl(siteUrl) });
  return { success: true };
}

export async function recordUsage(licenseKey: string, siteUrl: string, count: number): Promise<void> {
  const license = await License.findOne({ license_key: licenseKey });
  if (!license) return;
  await Activation.updateOne(
    { license_id: license._id, site_url: normalizeSiteUrl(siteUrl) },
    { last_usage_count: count, last_check_at: new Date() },
  );
}

export type TransferResult = { success: true; license: LicenseDoc } | { success: false; message: string };

/** MERN plan §74: no active-subscription conflict, no suspended/cancelled license. */
export async function transferLicense(licenseId: string, currentUserId: string, newOwnerEmail: string): Promise<TransferResult> {
  const license = await License.findOne({ _id: licenseId, user_id: currentUserId });
  if (!license) return { success: false, message: "License not found." };
  if (license.status === "suspended" || license.status === "cancelled") {
    return { success: false, message: `A ${license.status} license cannot be transferred.` };
  }
  if (license.subscription_id) {
    const subscription = await Subscription.findById(license.subscription_id);
    if (subscription && ["active", "trialing", "past_due"].includes(subscription.status)) {
      return { success: false, message: "Cancel the subscription before transferring this license." };
    }
  }

  const newOwner = await User.findOne({ email: newOwnerEmail });
  if (!newOwner) return { success: false, message: "No account with that email yet." };
  if (newOwner._id.toString() === currentUserId) return { success: false, message: "License is already owned by this account." };

  license.user_id = newOwner._id as unknown as Types.ObjectId;
  license.organization_id = (await findPrimaryOrganization(newOwner._id))?._id;
  license.updated_at = new Date();
  await license.save();
  return { success: true, license };
}

export async function regenerateLicenseKey(licenseId: string, currentUserId: string): Promise<LicenseDoc | null> {
  const license = await License.findOne({ _id: licenseId, user_id: currentUserId });
  if (!license) return null;
  license.license_key = generateLicenseKey(license.plan);
  license.updated_at = new Date();
  await license.save();
  return license;
}
