import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Activation } from "../models/Activation.js";
import { License } from "../models/License.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { signAccessToken } from "../services/authService.js";

const app = createApp();
const zipPath = join(mkdtempSync(join(tmpdir(), "cg-update-")), "pro.zip");
writeFileSync(zipPath, "PK fake zip");

beforeEach(async () => {
  await Product.create({
    name: "Certificate Generator",
    slug: "certificate-generator",
    versions: [
      { version: "7.9.0", zip_filename: "free.zip", zip_path: "/nonexistent/free.zip", file_size: 1, is_current: true },
      { version: "1.4.0", edition: "pro", changelog: "Auto-updates.", zip_filename: "certificate-generator-pro-1.4.0.zip", zip_path: zipPath, file_size: 11, is_current: true },
    ],
  });
});

async function activatedLicense(site = "https://a.example.com") {
  const user = await User.create({ name: "U", email: `u${Date.now()}${Math.random()}@example.com`, password_hash: "x", role: "customer" });
  const license = await License.create({ license_key: `PRO-UPD-${Date.now()}-${Math.random()}`, user_id: user._id, plan: "pro", activation_limit: 1, expires_at: "2099-01-01" });
  await request(app).post("/api/payments/activate-remote").send({ license_key: license.license_key, site_url: site });
  return license;
}

const updateCheck = (license_key: string, site_url = "https://a.example.com") =>
  request(app).post("/api/payments/update-check").send({ license_key, site_url });

/** The path + query of the package link, for supertest. */
const packagePath = (url: string) => new URL(url).pathname + new URL(url).search;

describe("POST /api/payments/update-check", () => {
  it("gives an activated site the latest Pro version and a package link that downloads the ZIP", async () => {
    const license = await activatedLicense();

    const res = await updateCheck(license.license_key);
    expect(res.body).toMatchObject({ success: true, version: "1.4.0", changelog: "Auto-updates." });
    expect(res.body.package).toContain("/api/payments/download?token=");
    expect(res.body.package).not.toContain(license.license_key);

    const zip = await request(app).get(packagePath(res.body.package));
    expect(zip.status).toBe(200);
    expect(zip.headers["content-disposition"]).toContain("certificate-generator-pro-1.4.0.zip");
  });

  it("tells a removed site about the version but gives no package", async () => {
    const license = await activatedLicense();
    await Activation.deleteMany({ license_id: license._id });

    const res = await updateCheck(license.license_key);
    expect(res.body).toMatchObject({ success: true, version: "1.4.0" });
    expect(res.body.package).toBeUndefined();
  });

  it("answers nothing for an unknown key", async () => {
    const res = await updateCheck("PRO-DOES-NOT-EXIST");
    expect(res.body).toMatchObject({ success: false });
    expect(res.body.version).toBeUndefined();
  });
});

describe("GET /api/payments/download", () => {
  it("stops working once the license is suspended", async () => {
    const license = await activatedLicense();
    const link = (await updateCheck(license.license_key)).body.package;

    await License.updateOne({ _id: license._id }, { status: "suspended" });
    expect((await request(app).get(packagePath(link))).status).toBe(403);
  });

  it("refuses a tampered token and a login token", async () => {
    const license = await activatedLicense();
    const link: string = (await updateCheck(license.license_key)).body.package;

    expect((await request(app).get(packagePath(link) + "x")).status).toBe(403);
    const loginToken = signAccessToken({ sub: license.user_id.toString(), role: "customer" });
    expect((await request(app).get(`/api/payments/download?token=${loginToken}`)).status).toBe(403);
  });
});
