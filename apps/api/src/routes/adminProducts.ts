import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { Plan } from "../models/Plan.js";
import { Product } from "../models/Product.js";
import { audit } from "../services/auditService.js";
import { getLsStoreCurrency, getLsVariant } from "../services/payments/lemonsqueezy.provider.js";

export const adminProductsRouter = Router();
adminProductsRouter.use(requireAuth, requireAdmin);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Same idea as TEST_MONGODB_URI in __tests__/setup.ts — tests must not write
// into the real public/downloads directory a production deploy would serve from.
const downloadsDir =
  process.env.NODE_ENV === "test"
    ? path.join(os.tmpdir(), "clp-test-downloads")
    : path.join(__dirname, "..", "..", "public", "downloads", "products");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/zip" && !file.originalname.toLowerCase().endsWith(".zip")) {
      return cb(new Error("Only .zip files are accepted."));
    }
    cb(null, true);
  },
});

// multer's own errors (fileFilter rejection, size limit) reach next(err) as a
// plain/MulterError — without this they'd fall through to app.ts's catch-all
// 500 handler instead of a 400 the admin UI can show as a validation message.
function uploadZip(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) return res.status(400).json({ error: { code: "INVALID_INPUT", message: err instanceof Error ? err.message : "Invalid upload." } });
    next();
  });
}

// ---- Products ----

adminProductsRouter.get("/", async (_req, res) => {
  const products = await Product.find().sort({ name: 1 }).lean();
  const planCounts = await Plan.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$product_id", count: { $sum: 1 } } }]);
  const countByProduct = new Map(planCounts.map((p) => [p._id.toString(), p.count]));
  res.json(
    products.map((p) => ({
      ...p,
      plan_count: countByProduct.get(p._id.toString()) ?? 0,
      current_version: p.versions?.find((v) => v.is_current)?.version ?? null,
    })),
  );
});

adminProductsRouter.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });
  res.json(product);
});

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only.");

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  description: z.string().optional(),
  tagline: z.string().optional(),
});

adminProductsRouter.post("/", async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  if (await Product.findOne({ slug: parsed.data.slug })) {
    return res.status(409).json({ error: { code: "SLUG_TAKEN", message: "A product with that slug already exists." } });
  }

  const product = await Product.create(parsed.data);
  await audit({ actorId: req.user!.id, action: "product.create", resource: "Product", resourceId: product._id.toString(), after: parsed.data, ip: req.ip });
  res.status(201).json(product);
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tagline: z.string().optional(),
});

adminProductsRouter.patch("/:id", async (req, res) => {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });

  const before = { name: product.name, description: product.description, tagline: product.tagline };
  Object.assign(product, parsed.data);
  await product.save();

  await audit({ actorId: req.user!.id, action: "product.update", resource: "Product", resourceId: product._id.toString(), before, after: parsed.data, ip: req.ip });
  res.json(product);
});

adminProductsRouter.patch("/:id/status", async (req, res) => {
  const parsed = z.object({ status: z.enum(["active", "archived"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "status must be active or archived" } });

  const product = await Product.findByIdAndUpdate(req.params.id, { status: parsed.data.status }, { new: true });
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });

  await audit({ actorId: req.user!.id, action: "product.status", resource: "Product", resourceId: product._id.toString(), after: { status: product.status }, ip: req.ip });
  res.json(product);
});

// ---- Plans (pricing tiers shown on the product's public page) ----

adminProductsRouter.get("/:id/plans", async (req, res) => {
  const plans = await Plan.find({ product_id: req.params.id }).sort({ sort_order: 1 }).lean();
  res.json(plans);
});

// slug is the internal identifier licenses and checkout refer to — free-form,
// unique per product. A new product can define whatever tiers it needs.
const planSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Plan slug must be lowercase letters, numbers and dashes"),
  name: z.string().min(1),
  billing_type: z.enum(["free", "recurring", "contact"]),
  price_monthly: z.number().nullable().optional(),
  price_yearly: z.number().nullable().optional(),
  price_note: z.string().optional(),
  // ISO 4217 code, stored lowercase like the rest ("inr").
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter code such as INR")
    .transform((c) => c.toLowerCase())
    .optional(),
  cert_limit: z.number().int().min(0),
  bulk_cap: z.number().int().min(0),
  activation_limit: z.number().int().min(0).optional(),
  stripe_price_monthly: z.string().optional(),
  stripe_price_yearly: z.string().optional(),
  ls_variant_monthly: z.string().optional(),
  ls_variant_yearly: z.string().optional(),
  license_key_prefix: z.string().regex(/^[A-Za-z0-9]{1,6}$/, "Key prefix must be 1–6 letters or numbers").optional().or(z.literal("")),
  cta_label: z.string().min(1),
  cta_type: z.enum(["register", "checkout", "contact"]),
  highlighted: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

/**
 * A typo'd variant id only shows up when a customer clicks Subscribe, so check it on save: it must exist in the
 * store, be a subscription with the right interval, and cost what the plan says the site shows, in the store's
 * currency (a USD label on rupee variants would show "$249" for a ₹249 charge).
 * Skipped when no Lemon Squeezy key is configured (e.g. tests, or a Stripe-only deploy).
 */
async function lemonSqueezyVariantProblem(plan: {
  ls_variant_monthly?: string;
  ls_variant_yearly?: string;
  price_monthly?: number | null;
  price_yearly?: number | null;
  currency?: string;
}): Promise<string | null> {
  if (!process.env.LEMONSQUEEZY_API_KEY) return null;
  if (plan.ls_variant_monthly?.trim() || plan.ls_variant_yearly?.trim()) {
    const store = await getLsStoreCurrency();
    const planCurrency = (plan.currency ?? "inr").toLowerCase();
    if (planCurrency !== store) {
      return `This plan's currency is ${planCurrency.toUpperCase()}, but your Lemon Squeezy store charges in ${store.toUpperCase()}. Set the currency to ${store.toUpperCase()}.`;
    }
  }
  const checks = [
    { id: plan.ls_variant_monthly, interval: "month", price: plan.price_monthly, label: "monthly" },
    { id: plan.ls_variant_yearly, interval: "year", price: plan.price_yearly, label: "yearly" },
  ] as const;
  for (const check of checks) {
    const id = check.id?.trim();
    if (!id) continue;
    if (!/^\d+$/.test(id)) return `The ${check.label} variant id should be a number (Lemon Squeezy → Products → the variant).`;
    const variant = await getLsVariant(id);
    if (!variant) {
      return `Lemon Squeezy has no variant ${id} (the ${check.label} variant id). Copy the variant's id from Lemon Squeezy → Products, not its price.`;
    }
    if (!variant.is_subscription || variant.interval !== check.interval) {
      return `Variant ${id} ("${variant.name}") isn't a ${check.interval}ly subscription, so it can't be the ${check.label} variant.`;
    }
    if (check.price != null && variant.price !== Math.round(check.price * 100)) {
      return `Variant ${id} ("${variant.name}") costs ${variant.price / 100} in Lemon Squeezy but the ${check.label} price here is ${check.price}. Make them match.`;
    }
  }
  return null;
}

function splitClearedVariants<T extends { ls_variant_monthly?: string; ls_variant_yearly?: string }>(data: T) {
  const $set: Partial<T> = { ...data };
  const $unset: Record<string, 1> = {};
  for (const key of ["ls_variant_monthly", "ls_variant_yearly"] as const) {
    if (data[key] !== undefined && !data[key]?.trim()) {
      delete $set[key];
      $unset[key] = 1;
    }
  }
  return { $set, $unset };
}

adminProductsRouter.post("/:id/plans", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });

  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  const variantProblem = await lemonSqueezyVariantProblem(parsed.data);
  if (variantProblem) return res.status(400).json({ error: { code: "INVALID_VARIANT", message: variantProblem } });

  if (await Plan.findOne({ product_id: product._id, slug: parsed.data.slug })) {
    return res.status(409).json({ error: { code: "SLUG_TAKEN", message: "This product already has a plan with that slug." } });
  }

  const plan = await Plan.create({ ...splitClearedVariants(parsed.data).$set, product_id: product._id });
  await audit({ actorId: req.user!.id, action: "plan.create", resource: "Plan", resourceId: plan._id.toString(), after: parsed.data, ip: req.ip });
  res.status(201).json(plan);
});

adminProductsRouter.patch("/:id/plans/:planId", async (req, res) => {
  const parsed = planSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  const existing = await Plan.findOne({ _id: req.params.planId, product_id: req.params.id }).lean();
  if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found." } });
  // Check the plan as it will be after this edit, so changing only a price still has to match the variant.
  const variantProblem = await lemonSqueezyVariantProblem({ ...existing, ...parsed.data });
  if (variantProblem) return res.status(400).json({ error: { code: "INVALID_VARIANT", message: variantProblem } });

  // A variant id sent as "" clears it, rather than leaving a stale id that checkout would try.
  const { $set, $unset } = splitClearedVariants(parsed.data);
  const plan = await Plan.findOneAndUpdate(
    { _id: req.params.planId, product_id: req.params.id },
    { $set, ...(Object.keys($unset).length ? { $unset } : {}) },
    { new: true },
  );
  if (!plan) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found." } });

  await audit({ actorId: req.user!.id, action: "plan.update", resource: "Plan", resourceId: plan._id.toString(), after: parsed.data, ip: req.ip });
  res.json(plan);
});

adminProductsRouter.patch("/:id/plans/:planId/status", async (req, res) => {
  const parsed = z.object({ status: z.enum(["active", "archived"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "status must be active or archived" } });

  const plan = await Plan.findOneAndUpdate({ _id: req.params.planId, product_id: req.params.id }, { status: parsed.data.status }, { new: true });
  if (!plan) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found." } });

  await audit({ actorId: req.user!.id, action: "plan.status", resource: "Plan", resourceId: plan._id.toString(), after: { status: plan.status }, ip: req.ip });
  res.json(plan);
});

// ---- Versions (changelog + the zip customers download) ----

adminProductsRouter.get("/:id/versions", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });
  // .lean() skips Mongoose's schema-default hydration, so a product saved before the
  // `versions` field existed comes back with it simply missing, not defaulted to [].
  res.json([...(product.versions ?? [])].sort((a, b) => new Date(b.released_at).getTime() - new Date(a.released_at).getTime()));
});

adminProductsRouter.post("/:id/versions", uploadZip, async (req, res) => {
  const parsed = z.object({ version: z.string().min(1), edition: z.enum(["free", "pro"]).default("free"), changelog: z.string().optional(), is_current: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  if (!req.file) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "A .zip file is required." } });

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });

  const productDir = path.join(downloadsDir, product.slug);
  fs.mkdirSync(productDir, { recursive: true });
  const zipFilename = `${randomUUID()}.zip`;
  const zipPath = path.join(productDir, zipFilename);
  fs.writeFileSync(zipPath, req.file.buffer);

  const isCurrent = parsed.data.is_current !== "false"; // default true — a freshly uploaded version is usually meant to go live
  if (isCurrent) {
    // Versions uploaded before `edition` existed have it unset — treat as free.
    for (const v of product.versions) if ((v.edition ?? "free") === parsed.data.edition) v.is_current = false;
  }
  product.versions.push({
    version: parsed.data.version,
    edition: parsed.data.edition,
    changelog: parsed.data.changelog,
    zip_filename: req.file.originalname,
    zip_path: zipPath,
    file_size: req.file.size,
    released_at: new Date(),
    is_current: isCurrent,
  } as never);
  await product.save();

  await audit({
    actorId: req.user!.id,
    action: "product.version.upload",
    resource: "Product",
    resourceId: product._id.toString(),
    after: { version: parsed.data.version, edition: parsed.data.edition, is_current: isCurrent },
    ip: req.ip,
  });
  res.status(201).json(product.versions[product.versions.length - 1]);
});

adminProductsRouter.patch("/:id/versions/:versionId/set-current", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });

  const target = product.versions.find((v) => v._id.toString() === req.params.versionId);
  if (!target) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Version not found." } });

  const edition = target.edition ?? "free";
  for (const v of product.versions) if ((v.edition ?? "free") === edition) v.is_current = false;
  target.is_current = true;
  await product.save();

  await audit({
    actorId: req.user!.id,
    action: "product.version.set_current",
    resource: "Product",
    resourceId: product._id.toString(),
    after: { version: target.version },
    ip: req.ip,
  });
  res.json(product.versions);
});
