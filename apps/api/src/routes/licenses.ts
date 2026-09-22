import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { License } from "../models/License.js";
import { Activation } from "../models/Activation.js";
import { normalizeSiteUrl, regenerateLicenseKey, transferLicense } from "../services/licenseService.js";

export const licensesRouter = Router();

licensesRouter.get("/me", requireAuth, async (req, res) => {
  const licenses = await License.find({ user_id: req.user!.id }).lean();
  const withActivations = await Promise.all(
    licenses.map(async (license) => ({
      ...license,
      activations: await Activation.find({ license_id: license._id }).lean(),
    })),
  );
  res.json(withActivations);
});

licensesRouter.post("/:id/deactivate", requireAuth, async (req, res) => {
  const parsed = z.object({ site_url: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "site_url is required" } });

  const license = await License.findOne({ _id: req.params.id, user_id: req.user!.id });
  if (!license) return res.status(404).json({ error: { code: "NOT_FOUND", message: "License not found." } });

  await Activation.deleteOne({ license_id: license._id, site_url: normalizeSiteUrl(parsed.data.site_url) });
  res.status(204).end();
});

licensesRouter.post("/:id/transfer", requireAuth, async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "email is required" } });

  const result = await transferLicense(req.params.id, req.user!.id, parsed.data.email);
  if (!result.success) return res.status(400).json({ error: { code: "TRANSFER_FAILED", message: result.message } });
  res.json(result.license);
});

licensesRouter.post("/:id/regenerate-key", requireAuth, async (req, res) => {
  const license = await regenerateLicenseKey(req.params.id, req.user!.id);
  if (!license) return res.status(404).json({ error: { code: "NOT_FOUND", message: "License not found." } });
  res.json(license);
});
