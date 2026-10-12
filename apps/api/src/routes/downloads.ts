import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { License } from "../models/License.js";
import { Product } from "../models/Product.js";

export const downloadsRouter = Router();

type Edition = "free" | "pro";

// Any product slug works (including ones created later in the admin Products
// CMS); no ?product= keeps old plugin builds downloading Certificate Generator.
function resolveSlug(req: Request): string {
  return typeof req.query.product === "string" && req.query.product ? req.query.product : "certificate-generator";
}

// No ?edition= means the free plugin, so old links keep working.
function resolveEdition(req: Request): Edition {
  return req.query.edition === "pro" ? "pro" : "free";
}

async function currentVersion(slug: string, edition: Edition) {
  const product = await Product.findOne({ slug }).lean();
  // .lean() skips schema-default hydration — a product saved before `versions`
  // (or `edition`) existed has the field missing entirely, not defaulted.
  return product?.versions?.find((v) => v.is_current && (v.edition ?? "free") === edition);
}

// Free is a public download, no account needed. Pro needs login + an active
// Pro/Business license for this product.
function requireEditionAccess(req: Request, res: Response, next: NextFunction) {
  if (resolveEdition(req) === "free") return next();
  requireAuth(req, res, async () => {
    try {
      const licensed = await License.exists({
        user_id: req.user!.id,
        product: resolveSlug(req),
        plan: { $in: ["pro", "business"] },
        status: "active",
        // status can lag the date until the worker sweeps it; YYYY-MM-DD compares lexically.
        expires_at: { $gte: new Date().toISOString().slice(0, 10) },
      });
      if (!licensed) {
        return res.status(403).json({ error: { code: "PRO_LICENSE_REQUIRED", message: "An active Pro license is required to download Pro." } });
      }
      next();
    } catch (err) {
      next(err);
    }
  });
}

downloadsRouter.get("/plugin/info", requireEditionAccess, async (req, res) => {
  const version = await currentVersion(resolveSlug(req), resolveEdition(req));
  if (!version) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plugin package not available." } });
  res.json({ version: version.version, filename: version.zip_filename });
});

downloadsRouter.get("/plugin", requireEditionAccess, async (req, res) => {
  const version = await currentVersion(resolveSlug(req), resolveEdition(req));
  if (!version) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plugin package not available." } });
  res.download(version.zip_path, version.zip_filename, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plugin package not available." } });
    }
  });
});
