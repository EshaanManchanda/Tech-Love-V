import { Router } from "express";
import { z } from "zod";
import { activateSite, checkLicense, deactivateSite, recordUsage, type PlanLimits } from "../services/licenseService.js";

export const pluginLicenseRouter = Router();

const activateSchema = z.object({ license_key: z.string().min(1), site_url: z.string().min(1) });
const usageSchema = z.object({ license_key: z.string().min(1), site_url: z.string().min(1), count: z.number() });

/**
 * { success, valid, plan?, expiry?, status?, limits?, message? } — the shape
 * CG_License_Manager::remote_validate() expects. `limits` is new/additive —
 * a plugin build that doesn't read it is unaffected (see plugin-compat prompt).
 */
function toBody(result: { valid: boolean; status: string; message?: string; plan?: string; expiry?: string; limits?: PlanLimits }) {
  return {
    success: true,
    valid: result.valid,
    status: result.status,
    ...(result.plan ? { plan: result.plan } : {}),
    ...(result.expiry ? { expiry: result.expiry } : {}),
    ...(result.limits ? { limits: result.limits } : {}),
    ...(result.message ? { message: result.message } : {}),
  };
}

// POST /api/payments/activate-remote — called by CG_License_Manager::remote_validate() on activation + heartbeat
pluginLicenseRouter.post("/activate-remote", async (req, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "license_key and site_url are required" });

  const result = await activateSite(parsed.data.license_key, parsed.data.site_url, { ip: req.ip });
  res.json(toBody(result));
});

// POST /api/payments/verify-license — read-only parity endpoint (not yet called by the plugin, kept for CG_Backend_API::verify_license())
// site_url is optional — only consulted for trial licenses, whose expiry is tracked per-site.
pluginLicenseRouter.post("/verify-license", async (req, res) => {
  const parsed = z.object({ license_key: z.string().min(1), site_url: z.string().min(1).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "license_key is required" });

  const { result } = await checkLicense(parsed.data.license_key, parsed.data.site_url);
  res.json(toBody(result));
});

// POST /api/payments/deactivate-remote — called from the plugin's admin License tab on deactivate
pluginLicenseRouter.post("/deactivate-remote", async (req, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "license_key and site_url are required" });

  const result = await deactivateSite(parsed.data.license_key, parsed.data.site_url);
  res.json(result);
});

// POST /api/payments/usage — fire-and-forget from the plugin, 1s timeout, no response body required
pluginLicenseRouter.post("/usage", async (req, res) => {
  const parsed = usageSchema.safeParse(req.body);
  if (parsed.success) {
    recordUsage(parsed.data.license_key, parsed.data.site_url, parsed.data.count).catch(() => {});
  }
  res.status(204).end();
});
