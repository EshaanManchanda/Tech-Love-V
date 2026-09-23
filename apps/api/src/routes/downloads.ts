import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Product } from "../models/Product.js";

export const downloadsRouter = Router();

function resolveSlug(req: { query: { product?: unknown } }): string {
  return req.query.product === "dynamic-tags" ? "dynamic-tags" : "certificate-generator";
}

async function currentVersion(slug: string) {
  const product = await Product.findOne({ slug }).lean();
  return product?.versions.find((v) => v.is_current);
}

// Available to every logged-in user regardless of plan — Free tier needs the
// plugin too, since only *activation* (not installation) is plan-gated.
downloadsRouter.get("/plugin/info", requireAuth, async (req, res) => {
  const version = await currentVersion(resolveSlug(req));
  if (!version) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plugin package not available." } });
  res.json({ version: version.version, filename: version.zip_filename });
});

downloadsRouter.get("/plugin", requireAuth, async (req, res) => {
  const version = await currentVersion(resolveSlug(req));
  if (!version) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plugin package not available." } });
  res.download(version.zip_path, version.zip_filename, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plugin package not available." } });
    }
  });
});
