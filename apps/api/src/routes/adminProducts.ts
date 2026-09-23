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

// Matches Plan.ts's Mongoose enum exactly — slug is a fixed internal identifier
// (same 4 tiers every product today uses); the admin-facing "name" field is
// free-form, so a new product's plans still get their own display label/copy.
const planSchema = z.object({
  slug: z.enum(["free", "pro", "business", "paid"]),
  name: z.string().min(1),
  billing_type: z.enum(["free", "recurring", "contact"]),
  price_monthly: z.number().nullable().optional(),
  price_yearly: z.number().nullable().optional(),
  price_note: z.string().optional(),
  currency: z.string().optional(),
  cert_limit: z.number().int().min(0),
  bulk_cap: z.number().int().min(0),
  activation_limit: z.number().int().min(0).optional(),
  cta_label: z.string().min(1),
  cta_type: z.enum(["register", "checkout", "contact"]),
  highlighted: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

adminProductsRouter.post("/:id/plans", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });

  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  if (await Plan.findOne({ product_id: product._id, slug: parsed.data.slug })) {
    return res.status(409).json({ error: { code: "SLUG_TAKEN", message: "This product already has a plan with that slug." } });
  }

  const plan = await Plan.create({ ...parsed.data, product_id: product._id });
  await audit({ actorId: req.user!.id, action: "plan.create", resource: "Plan", resourceId: plan._id.toString(), after: parsed.data, ip: req.ip });
  res.status(201).json(plan);
});

adminProductsRouter.patch("/:id/plans/:planId", async (req, res) => {
  const parsed = planSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  const plan = await Plan.findOneAndUpdate({ _id: req.params.planId, product_id: req.params.id }, parsed.data, { new: true });
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
  const parsed = z.object({ version: z.string().min(1), changelog: z.string().optional(), is_current: z.string().optional() }).safeParse(req.body);
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
    for (const v of product.versions) v.is_current = false;
  }
  product.versions.push({
    version: parsed.data.version,
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
    after: { version: parsed.data.version, is_current: isCurrent },
    ip: req.ip,
  });
  res.status(201).json(product.versions[product.versions.length - 1]);
});

adminProductsRouter.patch("/:id/versions/:versionId/set-current", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });

  const target = product.versions.find((v) => v._id.toString() === req.params.versionId);
  if (!target) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Version not found." } });

  for (const v of product.versions) v.is_current = false;
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
