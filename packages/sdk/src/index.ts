/**
 * Thin client for the license platform's plugin-facing endpoints
 * (`/api/payments/*`). Mirrors the exact contract `CG_License_Manager` and
 * `CG_Backend_API` expect in the actual WordPress plugin — see
 * apps/api/src/routes/pluginLicense.ts, which this is a client for.
 *
 * Deliberately minimal: no retries, no auth (those endpoints are
 * unauthenticated by design, rate-limited server-side). Useful today for
 * scripts/tests; a future non-WordPress integration (e.g. a Laravel app)
 * would use the same shape.
 */

export interface CertificateLicenseClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export type PluginPlan = "pro" | "business";
export type PluginLicenseStatus = "active" | "invalid" | "expired" | "suspended" | "cancelled";

export interface PluginValidationResult {
  success: boolean;
  valid: boolean;
  status: PluginLicenseStatus;
  plan?: PluginPlan;
  expiry?: string;
  message?: string;
}

export class CertificateLicenseClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CertificateLicenseClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Activates a site against a license key, or re-touches an already-activated one (no slot consumed). */
  activateSite(licenseKey: string, siteUrl: string): Promise<PluginValidationResult> {
    return this.post("/api/payments/activate-remote", { license_key: licenseKey, site_url: siteUrl });
  }

  /** Read-only check. Defined for parity with CG_Backend_API::verify_license() — not currently called by the plugin. */
  verifyLicense(licenseKey: string): Promise<PluginValidationResult> {
    return this.post("/api/payments/verify-license", { license_key: licenseKey });
  }

  /** Always resolves success — matches the plugin's fire-and-forget deactivation expectation. */
  deactivateSite(licenseKey: string, siteUrl: string): Promise<{ success: boolean }> {
    return this.post("/api/payments/deactivate-remote", { license_key: licenseKey, site_url: siteUrl });
  }

  /** Fire-and-forget usage report — server always responds 204. */
  async reportUsage(licenseKey: string, siteUrl: string, count: number): Promise<void> {
    await this.post("/api/payments/usage", { license_key: licenseKey, site_url: siteUrl, count });
  }
}
