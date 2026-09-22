import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { License } from "../models/License.js";
import { Activation } from "../models/Activation.js";
import { normalizeSiteUrl } from "../services/licenseService.js";

const app = createApp();

async function makeLicense(
  overrides: Partial<{
    activation_limit: number;
    expires_at: string;
    status: "active" | "suspended" | "cancelled";
    license_type: "standard" | "trial";
    trial_duration_days: number;
    plan: "pro" | "business" | "paid";
    product: "certificate-generator" | "dynamic-tags";
  }> = {},
) {
  const user = await User.create({ name: "Test", email: `t${Date.now()}${Math.random()}@example.com`, password_hash: "x", role: "customer" });
  const plan = overrides.plan ?? (overrides.license_type === "trial" ? "business" : "pro");
  return License.create({
    license_key: `${overrides.product === "dynamic-tags" ? "DT" : "CG"}-TEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    user_id: user._id,
    product: overrides.product ?? "certificate-generator",
    plan,
    status: overrides.status ?? "active",
    activation_limit: overrides.activation_limit ?? 1,
    expires_at: overrides.expires_at ?? "2099-01-01",
    license_type: overrides.license_type ?? "standard",
    trial_duration_days: overrides.trial_duration_days,
  });
}

describe("POST /api/payments/activate-remote", () => {
  it("activates the first site within the activation limit", async () => {
    const license = await makeLicense({ activation_limit: 1 });

    const res = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ valid: true, status: "active", plan: "pro" });
  });

  it("rejects a second site once the activation limit is reached", async () => {
    const license = await makeLicense({ activation_limit: 1 });

    await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });
    const second = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://b.example.com" });

    expect(second.body.valid).toBe(false);
    expect(second.body.message).toMatch(/activation limit reached/i);
  });

  it("re-activating the same already-active site succeeds without consuming a second slot", async () => {
    const license = await makeLicense({ activation_limit: 1 });

    await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });
    const again = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });

    expect(again.body.valid).toBe(true);
  });

  it("marks an expired license invalid instead of activating it", async () => {
    const license = await makeLicense({ expires_at: "2000-01-01" });

    const res = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });

    expect(res.body).toMatchObject({ valid: false, status: "expired" });
  });

  it("marks an unknown license key invalid", async () => {
    const res = await request(app).post("/api/payments/activate-remote").send({ license_key: "CG-DOES-NOT-EXIST", site_url: "https://a.example.com" });

    expect(res.body).toMatchObject({ valid: false, status: "invalid" });
  });

  it("marks a suspended license invalid", async () => {
    const license = await makeLicense({ status: "suspended" });

    const res = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });

    expect(res.body).toMatchObject({ valid: false, status: "suspended" });
  });

  it("includes effective limits in the response, honoring a custom_terms override", async () => {
    const license = await makeLicense({ activation_limit: 12 });
    await License.updateOne({ _id: license._id }, { custom_terms: { cert_limit: 3000, bulk_cap: 500 } });

    const res = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });

    expect(res.body.limits).toMatchObject({ activation_limit: 12, cert_limit: 3000, bulk_cap: 500 });
  });

  it("treats http/https and www. variants of the same site as one activation, not two", async () => {
    const license = await makeLicense({ activation_limit: 2 });

    await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "http://Example.com/" });
    const second = await request(app)
      .post("/api/payments/activate-remote")
      .send({ license_key: license.license_key, site_url: "https://www.example.com" });

    expect(second.body.valid).toBe(true);

    // The http->https/www. re-activation above must not have consumed a second slot —
    // a genuinely different site still fits within the limit of 2.
    const third = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://b.example.com" });
    expect(third.body.valid).toBe(true);
  });
});

describe("trial licenses: per-site expiry", () => {
  it("sets an independent expires_at for each site, both ~trial_duration_days from now", async () => {
    const license = await makeLicense({ license_type: "trial", trial_duration_days: 180, activation_limit: 5 });

    const a = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });
    const b = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://b.example.com" });

    expect(a.body).toMatchObject({ valid: true, status: "active", plan: "business" });
    expect(b.body).toMatchObject({ valid: true, status: "active", plan: "business" });

    const activations = await Activation.find({ license_id: license._id }).sort({ site_url: 1 });
    expect(activations).toHaveLength(2);
    for (const activation of activations) {
      expect(activation.expires_at).toBeTruthy();
      const daysUntilExpiry = (activation.expires_at!.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(daysUntilExpiry).toBeGreaterThan(179);
      expect(daysUntilExpiry).toBeLessThan(181);
    }
  });

  it("expires one site independently of another still within its own window", async () => {
    const license = await makeLicense({ license_type: "trial", trial_duration_days: 180, activation_limit: 5 });

    await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://expired.example.com" });
    await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://fresh.example.com" });

    await Activation.updateOne(
      { license_id: license._id, site_url: normalizeSiteUrl("https://expired.example.com") },
      { expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    );

    const expiredCheck = await request(app)
      .post("/api/payments/verify-license")
      .send({ license_key: license.license_key, site_url: "https://expired.example.com" });
    const freshCheck = await request(app)
      .post("/api/payments/verify-license")
      .send({ license_key: license.license_key, site_url: "https://fresh.example.com" });

    expect(expiredCheck.body).toMatchObject({ valid: false, status: "expired" });
    expect(freshCheck.body).toMatchObject({ valid: true, status: "active", plan: "business" });
  });
});

describe("Dynamic Tags product", () => {
  it("activates a dynamic-tags/paid license and returns plan: paid", async () => {
    const license = await makeLicense({ product: "dynamic-tags", plan: "paid" });

    const res = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });

    expect(res.body).toMatchObject({ valid: true, status: "active", plan: "paid" });
  });
});

describe("POST /api/payments/deactivate-remote", () => {
  it("frees up an activation slot", async () => {
    const license = await makeLicense({ activation_limit: 1 });
    await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });

    await request(app).post("/api/payments/deactivate-remote").send({ license_key: license.license_key, site_url: "https://a.example.com" });
    const res = await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: "https://b.example.com" });

    expect(res.body.valid).toBe(true);
  });
});
