import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { activationLimitFor, productForPlan, type PlanSlug } from "../config/plans.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { Activation } from "../models/Activation.js";
import { AuditLog } from "../models/AuditLog.js";
import { Coupon } from "../models/Coupon.js";
import { FeatureFlag } from "../models/FeatureFlag.js";
import { License } from "../models/License.js";
import { Plan } from "../models/Plan.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { enqueueEmail } from "../queues/emailQueue.js";
import { audit } from "../services/auditService.js";
import { cookieDomain, hashPassword, signImpersonationToken, signSetPasswordToken } from "../services/authService.js";
import { generateLicenseKey, todayIsoDate } from "../services/licenseService.js";
import { createPersonalOrganization, findPrimaryOrganization } from "../services/organizationService.js";
import { stripe } from "../services/stripeClient.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/customers", async (req, res) => {
  const filter: Record<string, unknown> = { role: "customer" };
  if (req.query.status === "active" || req.query.status === "disabled") filter.status = req.query.status;
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const q = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
  }
  const customers = await User.find(filter).select("-password_hash").lean();
  res.json(customers);
});

const passwordModeSchema = z
  .object({
    mode: z.enum(["email_link", "set_password"]).default("email_link"),
    password: z.string().min(8).optional(),
  })
  .refine((d) => d.mode !== "set_password" || !!d.password, { message: "password (min 8 chars) is required when mode is set_password" });

const createCustomerSchema = z.object({ name: z.string().min(1), email: z.string().email() }).and(passwordModeSchema);

adminRouter.post("/customers", async (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  const { name, email, mode, password } = parsed.data;

  if (await User.findOne({ email })) {
    return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "An account with that email already exists." } });
  }

  const passwordHash = await hashPassword(mode === "set_password" ? password! : randomBytes(24).toString("hex"));
  const user = await User.create({ name, email, password_hash: passwordHash, role: "customer" });
  await createPersonalOrganization(user._id, user.name);

  if (mode === "email_link") {
    enqueueEmail("account-created", user.email, {
      name: user.name,
      setPasswordUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/set-password?token=${signSetPasswordToken(user._id.toString())}`,
    });
  }

  await audit({ actorId: req.user!.id, action: "customer.create", resource: "User", resourceId: user._id.toString(), after: { name, email, mode }, ip: req.ip });
  res.status(201).json({ _id: user._id, name: user.name, email: user.email, status: user.status, created_at: user.created_at });
});

const updateCustomerSchema = z
  .object({ name: z.string().min(1).optional(), email: z.string().email().optional() })
  .refine((d) => d.name !== undefined || d.email !== undefined, { message: "Provide at least one field to update." });

adminRouter.patch("/customers/:id", async (req, res) => {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Customer not found." } });

  if (parsed.data.email && parsed.data.email !== user.email && (await User.findOne({ email: parsed.data.email }))) {
    return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "An account with that email already exists." } });
  }

  const before = { name: user.name, email: user.email };
  if (parsed.data.name) user.name = parsed.data.name;
  if (parsed.data.email) user.email = parsed.data.email;
  await user.save();

  await audit({
    actorId: req.user!.id,
    action: "customer.update",
    resource: "User",
    resourceId: user._id.toString(),
    before,
    after: { name: user.name, email: user.email },
    ip: req.ip,
  });
  res.json({ _id: user._id, name: user.name, email: user.email, status: user.status, created_at: user.created_at });
});

adminRouter.post("/customers/:id/deactivate", async (req, res) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: { code: "INVALID_ACTION", message: "You can't deactivate your own account." } });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { status: "disabled" }, { new: true });
  if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Customer not found." } });
  await audit({ actorId: req.user!.id, action: "customer.deactivate", resource: "User", resourceId: user._id.toString(), ip: req.ip });
  res.json({ _id: user._id, status: user.status });
});

adminRouter.post("/customers/:id/reactivate", async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true });
  if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Customer not found." } });
  await audit({ actorId: req.user!.id, action: "customer.reactivate", resource: "User", resourceId: user._id.toString(), ip: req.ip });
  res.json({ _id: user._id, status: user.status });
});

adminRouter.post("/customers/:id/reset-password", async (req, res) => {
  const parsed = passwordModeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Customer not found." } });

  if (parsed.data.mode === "set_password") {
    user.password_hash = await hashPassword(parsed.data.password!);
    await user.save();
  } else {
    enqueueEmail("password-reset", user.email, {
      name: user.name,
      resetUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/set-password?token=${signSetPasswordToken(user._id.toString(), "1h")}`,
    });
  }

  await audit({
    actorId: req.user!.id,
    action: "customer.reset_password",
    resource: "User",
    resourceId: user._id.toString(),
    after: { mode: parsed.data.mode },
    ip: req.ip,
  });
  res.json({ message: parsed.data.mode === "set_password" ? "Password updated." : "Reset link sent." });
});

adminRouter.get("/licenses", async (_req, res) => {
  const licenses = await License.find().populate("user_id", "name email").lean();
  const withActivations = await Promise.all(
    licenses.map(async (license) => ({
      ...license,
      activations: await Activation.find({ license_id: license._id }).select("site_url activated_at expires_at").lean(),
    })),
  );
  res.json(withActivations);
});

const customTermsSchema = z.object({
  cert_limit: z.number().int().positive().optional(),
  bulk_cap: z.number().int().positive().optional(),
  price_note: z.string().optional(),
});

const createLicenseSchema = z
  .object({
    user_id: z.string().min(1).optional(),
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    plan: z.enum(["pro", "business", "paid"]),
    activation_limit: z.number().int().positive().optional(),
    duration_days: z.number().int().positive().optional(),
    expires_at: z.string().optional(),
    custom_terms: customTermsSchema.optional(),
    // Trial/promo grant: business plan, 6 months from each site's own activation
    // date rather than a single issuance-anchored expires_at — see licenseService.
    license_type: z.enum(["standard", "trial"]).optional(),
    trial_duration_days: z.number().int().positive().optional(),
  })
  .refine((data) => !!data.user_id !== !!data.email, {
    message: "Provide either user_id (existing customer) or email+name (new customer), not both.",
  })
  .refine((data) => !data.email || !!data.name, { message: "name is required when creating a new customer." })
  .refine((data) => data.plan !== "paid" || data.license_type !== "trial", {
    message: "Dynamic Tags has no trial plan.",
  });

adminRouter.post("/licenses", async (req, res) => {
  const parsed = createLicenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  const data = parsed.data;

  let user;
  let isNewUser = false;
  if (data.user_id) {
    user = await User.findById(data.user_id);
    if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Customer not found." } });
  } else {
    if (await User.findOne({ email: data.email })) {
      return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "An account with that email already exists — use the existing-customer option instead." } });
    }
    const temporaryPassword = randomBytes(24).toString("hex");
    user = await User.create({ name: data.name, email: data.email, password_hash: await hashPassword(temporaryPassword), role: "customer" });
    await createPersonalOrganization(user._id, user.name);
    isNewUser = true;
  }

  const organization = await findPrimaryOrganization(user._id);
  const isTrial = data.license_type === "trial";
  const plan: PlanSlug = isTrial ? "business" : (data.plan as PlanSlug);
  // Trial expiry is tracked per-site (Activation.expires_at, set on first activation) — the
  // License itself gets a far-future placeholder so the shared isExpired() check never trips it.
  const expiresAt = isTrial ? "2099-12-31" : (data.expires_at ?? addDays(todayIsoDate(), data.duration_days ?? 365));

  const product = productForPlan(plan);
  const license = await License.create({
    license_key: generateLicenseKey(plan),
    user_id: user._id,
    organization_id: organization?._id,
    product,
    plan,
    status: "active",
    activation_limit: data.activation_limit ?? activationLimitFor(plan),
    expires_at: expiresAt,
    custom_terms: data.custom_terms,
    license_type: data.license_type ?? "standard",
    trial_duration_days: isTrial ? (data.trial_duration_days ?? 180) : undefined,
  });

  await audit({
    actorId: req.user!.id,
    action: "license.create",
    resource: "License",
    resourceId: license._id.toString(),
    after: license.toObject() as unknown as Record<string, unknown>,
    ip: req.ip,
  });

  if (isNewUser) {
    enqueueEmail("invite", user.email, {
      name: user.name,
      plan,
      licenseKey: license.license_key,
      setPasswordUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/set-password?token=${signSetPasswordToken(user._id.toString())}`,
    });
  } else {
    enqueueEmail("license-created", user.email, { name: user.name, plan, licenseKey: license.license_key, expiresAt });
  }

  res.status(201).json(license);
});

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

adminRouter.post("/licenses/:id/extend", async (req, res) => {
  const parsed = z.object({ days: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "days (positive integer) is required" } });

  const license = await License.findById(req.params.id);
  if (!license) return res.status(404).json({ error: { code: "NOT_FOUND", message: "License not found." } });

  const before = license.expires_at;
  license.expires_at = addDays(license.expires_at, parsed.data.days);
  license.updated_at = new Date();
  await license.save();
  await audit({
    actorId: req.user!.id,
    action: "license.extend",
    resource: "License",
    resourceId: license._id.toString(),
    before: { expires_at: before },
    after: { expires_at: license.expires_at },
    ip: req.ip,
  });
  res.json(license);
});

adminRouter.post("/licenses/:id/disable", async (req, res) => {
  const license = await License.findByIdAndUpdate(req.params.id, { status: "suspended", updated_at: new Date() }, { new: true });
  if (!license) return res.status(404).json({ error: { code: "NOT_FOUND", message: "License not found." } });
  await audit({ actorId: req.user!.id, action: "license.disable", resource: "License", resourceId: license._id.toString(), ip: req.ip });
  res.json(license);
});

adminRouter.post("/licenses/:id/enable", async (req, res) => {
  const license = await License.findByIdAndUpdate(req.params.id, { status: "active", updated_at: new Date() }, { new: true });
  if (!license) return res.status(404).json({ error: { code: "NOT_FOUND", message: "License not found." } });
  await audit({ actorId: req.user!.id, action: "license.enable", resource: "License", resourceId: license._id.toString(), ip: req.ip });
  res.json(license);
});

const isProd = process.env.NODE_ENV === "production";

adminRouter.post("/users/:id/impersonate", async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found." } });

  const token = signImpersonationToken({ sub: target._id.toString(), role: target.role, impersonated_by: req.user!.id });
  res.cookie("access_token", token, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", domain: cookieDomain, maxAge: 5 * 60 * 1000 });
  res.clearCookie("refresh_token", { path: "/", domain: cookieDomain }); // no refresh — the impersonation session must expire on its own

  await audit({
    actorId: req.user!.id,
    action: "user.impersonate",
    resource: "User",
    resourceId: target._id.toString(),
    ip: req.ip,
  });

  res.json({ impersonating: { _id: target._id, name: target.name, email: target.email } });
});

adminRouter.get("/logs", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const logs = await AuditLog.find().sort({ created_at: -1 }).limit(limit).populate("actor_id", "name email").lean();
  res.json(logs);
});

adminRouter.get("/feature-flags", async (_req, res) => {
  res.json(await FeatureFlag.find().sort({ key: 1 }).lean());
});

const featureFlagSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(false),
  target_type: z.enum(["everyone", "plan", "user", "organization", "percentage"]).default("everyone"),
  target_plans: z.array(z.string()).optional(),
  target_user_ids: z.array(z.string()).optional(),
  target_organization_ids: z.array(z.string()).optional(),
  rollout_percentage: z.number().min(0).max(100).optional(),
});

adminRouter.post("/feature-flags", async (req, res) => {
  const parsed = featureFlagSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  const flag = await FeatureFlag.create(parsed.data);
  res.status(201).json(flag);
});

adminRouter.post("/feature-flags/:id/toggle", async (req, res) => {
  const parsed = z.object({ enabled: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "enabled (boolean) is required" } });
  const flag = await FeatureFlag.findByIdAndUpdate(req.params.id, { enabled: parsed.data.enabled }, { new: true });
  if (!flag) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Feature flag not found." } });
  res.json(flag);
});

adminRouter.get("/analytics/overview", async (_req, res) => {
  const [totalCustomers, licensesByStatusRows, activeSubs, plans, flaggedLicenses, totalActivations] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    License.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Subscription.find({ status: { $in: ["active", "trialing", "past_due"] } }).lean(),
    Plan.find().lean(),
    License.countDocuments({ flagged: true }),
    Activation.countDocuments(),
  ]);

  const priceByPlanSlug = new Map(plans.map((p) => [p.slug, p]));
  let mrr = 0;
  const planDistribution: Record<string, number> = {};
  for (const sub of activeSubs) {
    planDistribution[sub.plan] = (planDistribution[sub.plan] ?? 0) + 1;
    const plan = priceByPlanSlug.get(sub.plan);
    if (!plan) continue;
    mrr += sub.billing_cycle === "yearly" ? (plan.price_yearly ?? 0) / 12 : (plan.price_monthly ?? 0);
  }

  const licensesByStatus: Record<string, number> = {};
  for (const row of licensesByStatusRows) licensesByStatus[row._id] = row.count;
  const activeLicenseCount = licensesByStatus.active ?? 0;

  res.json({
    totalCustomers,
    licensesByStatus,
    flaggedLicenses,
    activeSubscriptions: activeSubs.length,
    planDistribution,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    avgSitesPerLicense: activeLicenseCount > 0 ? Math.round((totalActivations / activeLicenseCount) * 10) / 10 : 0,
  });
});

adminRouter.get("/coupons", async (_req, res) => {
  const coupons = await Coupon.find().sort({ created_at: -1 }).lean();
  res.json(coupons);
});

const couponCreateSchema = z.object({
  code: z.string().min(1),
  type: z.enum(["percentage", "fixed_amount", "free_trial", "free_months"]),
  value: z.number().positive(),
  max_redemptions: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
  applicable_plans: z.array(z.enum(["free", "pro", "business"])).optional(),
  // Required for free_trial/free_months — those need a Stripe coupon created
  // manually (trial/repeating-duration coupons aren't a simple percent/amount off).
  stripe_coupon_id: z.string().optional(),
});

adminRouter.post("/coupons", async (req, res) => {
  const parsed = couponCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  let stripeCouponId = parsed.data.stripe_coupon_id;
  if (!stripeCouponId) {
    if (parsed.data.type === "percentage") {
      const c = await stripe.coupons.create({ percent_off: parsed.data.value, duration: "once", name: parsed.data.code });
      stripeCouponId = c.id;
    } else if (parsed.data.type === "fixed_amount") {
      const c = await stripe.coupons.create({
        amount_off: Math.round(parsed.data.value * 100),
        currency: "usd",
        duration: "once",
        name: parsed.data.code,
      });
      stripeCouponId = c.id;
    } else {
      return res.status(400).json({
        error: { code: "MISSING_STRIPE_COUPON", message: "free_trial/free_months coupons require a stripe_coupon_id created in Stripe first." },
      });
    }
  }

  const coupon = await Coupon.create({
    code: parsed.data.code.toUpperCase(),
    stripe_coupon_id: stripeCouponId,
    type: parsed.data.type,
    value: parsed.data.value,
    max_redemptions: parsed.data.max_redemptions,
    expires_at: parsed.data.expires_at ? new Date(parsed.data.expires_at) : undefined,
    applicable_plans: parsed.data.applicable_plans ?? ["pro", "business"],
  });
  await audit({
    actorId: req.user!.id,
    action: "coupon.create",
    resource: "Coupon",
    resourceId: coupon._id.toString(),
    after: coupon.toObject() as unknown as Record<string, unknown>,
    ip: req.ip,
  });
  res.status(201).json(coupon);
});

adminRouter.post("/coupons/:id/disable", async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { status: "disabled" }, { new: true });
  if (!coupon) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Coupon not found." } });
  await audit({ actorId: req.user!.id, action: "coupon.disable", resource: "Coupon", resourceId: coupon._id.toString(), ip: req.ip });
  res.json(coupon);
});
