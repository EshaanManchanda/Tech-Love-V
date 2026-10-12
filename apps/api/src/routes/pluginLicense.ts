import { Router } from "express";
import { z } from "zod";
import { License } from "../models/License.js";
import { signDownloadToken, verifyDownloadToken } from "../services/authService.js";
import { activateSite, checkLicense, checkSite, deactivateSite, recordUsage, type PlanLimits } from "../services/licenseService.js";
import { currentVersion } from "./downloads.js";

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

// POST /api/payments/check-remote — called by CG_License_Manager::heartbeat(). Unlike
// activate-remote it never takes a seat, so a site removed in the dashboard stays removed.
pluginLicenseRouter.post("/check-remote", async (req, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "license_key and site_url are required" });

  const result = await checkSite(parsed.data.license_key, parsed.data.site_url, { ip: req.ip });
  res.json(toBody(result));
});

// POST /api/payments/update-check — called by WordPress's plugin update check (CG_Pro_Updater).
// Any known key learns the latest Pro version; only an active license on an activated
// site gets a package link. The link carries a signed token, never the key, so the key
// stays out of access logs.
pluginLicenseRouter.post("/update-check", async (req, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "license_key and site_url are required" });

  const license = await License.findOne({ license_key: parsed.data.license_key });
  const version = license && (await currentVersion(license.product, "pro"));
  if (!license || !version) return res.json({ success: false, message: "No update available for this key." });

  const check = await checkSite(parsed.data.license_key, parsed.data.site_url, { ip: req.ip });
  res.json({
    success: true,
    version: version.version,
    changelog: version.changelog ?? "",
    ...(check.valid
      ? { package: `${req.protocol}://${req.get("host")}/api/payments/download?token=${encodeURIComponent(signDownloadToken(license._id.toString(), parsed.data.site_url))}` }
      : { message: check.message }),
  });
});

// GET /api/payments/download?token=… — the package link from update-check. Re-checks the license
// and the site's activation, so a link stops working once either is gone.
pluginLicenseRouter.get("/download", async (req, res) => {
  let claim: { lic: string; site: string };
  try {
    claim = verifyDownloadToken(String(req.query.token ?? ""));
  } catch {
    return res.status(403).json({ success: false, message: "Download link is invalid or has expired." });
  }

  const license = await License.findById(claim.lic);
  const check = license ? await checkSite(license.license_key, claim.site) : null;
  if (!license || !check?.valid) return res.status(403).json({ success: false, message: "License is not active on this site." });

  const version = await currentVersion(license.product, "pro");
  if (!version) return res.status(404).json({ success: false, message: "Plugin package not available." });
  res.download(version.zip_path, version.zip_filename, (err) => {
    if (err && !res.headersSent) res.status(404).json({ success: false, message: "Plugin package not available." });
  });
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
