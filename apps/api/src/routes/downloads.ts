import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { PLUGIN_FILES } from "../config/plugin.js";
import type { ProductSlug } from "../config/plans.js";

export const downloadsRouter = Router();

function resolveProduct(req: { query: { product?: unknown } }): ProductSlug {
  return req.query.product === "dynamic-tags" ? "dynamic-tags" : "certificate-generator";
}

// Available to every logged-in user regardless of plan — Free tier needs the
// plugin too, since only *activation* (not installation) is plan-gated.
downloadsRouter.get("/plugin/info", requireAuth, (req, res) => {
  const { version, filename } = PLUGIN_FILES[resolveProduct(req)];
  res.json({ version, filename });
});

downloadsRouter.get("/plugin", requireAuth, (req, res) => {
  const { zipPath, filename } = PLUGIN_FILES[resolveProduct(req)];
  res.download(zipPath, filename, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plugin package not available." } });
    }
  });
});
