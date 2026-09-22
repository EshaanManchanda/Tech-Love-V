import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { License } from "../models/License.js";
import { User } from "../models/User.js";

const app = createApp();

// One shared admin agent for the whole file — /api/auth/login is rate-limited
// (5/min, see app.ts), and req.user comes from the JWT payload (no DB lookup
// per request), so the same cookie stays valid across every test's afterEach
// DB wipe. Registering+logging-in a fresh admin per test would blow the limit.
let adminAgent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  adminAgent = request.agent(app);
  const email = `admin${Date.now()}@example.com`;
  const res = await adminAgent.post("/api/auth/register").send({ name: "Admin", email, password: "password123" });
  await User.updateOne({ _id: res.body._id }, { role: "admin" });
  await adminAgent.post("/api/auth/login").send({ email, password: "password123" });
});

describe("POST /api/admin/licenses", () => {
  it("issues a license for an existing customer", async () => {
    const customer = await User.create({ name: "Customer", email: `c${Date.now()}@example.com`, password_hash: "x", role: "customer" });

    const res = await adminAgent.post("/api/admin/licenses").send({ user_id: customer._id.toString(), plan: "business" });

    expect(res.status).toBe(201);
    expect(res.body.plan).toBe("business");
    expect(res.body.activation_limit).toBe(5); // default for business
    expect(res.body.user_id).toBe(customer._id.toString());
  });

  it("creates a brand-new customer account when given email+name instead of user_id", async () => {
    const email = `newcustomer${Date.now()}@example.com`;

    const res = await adminAgent.post("/api/admin/licenses").send({ email, name: "New Customer", plan: "pro" });

    expect(res.status).toBe(201);
    const created = await User.findOne({ email });
    expect(created).not.toBeNull();
    expect(created?.role).toBe("customer");
    expect(res.body.user_id).toBe(created!._id.toString());
  });

  it("rejects a new-customer email that's already taken", async () => {
    const existing = await User.create({ name: "Existing", email: `dupe${Date.now()}@example.com`, password_hash: "x", role: "customer" });

    const res = await adminAgent.post("/api/admin/licenses").send({ email: existing.email, name: "Existing", plan: "pro" });

    expect(res.status).toBe(409);
  });

  it("honors a custom activation_limit and expires_at instead of the plan default", async () => {
    const customer = await User.create({ name: "Customer2", email: `c2${Date.now()}@example.com`, password_hash: "x", role: "customer" });

    const res = await adminAgent.post("/api/admin/licenses").send({
      user_id: customer._id.toString(),
      plan: "business",
      activation_limit: 12,
      expires_at: "2030-06-15",
      custom_terms: { cert_limit: 5000, price_note: "$199/mo, invoiced quarterly" },
    });

    expect(res.status).toBe(201);
    expect(res.body.activation_limit).toBe(12);
    expect(res.body.expires_at).toBe("2030-06-15");
    expect(res.body.custom_terms).toMatchObject({ cert_limit: 5000, price_note: "$199/mo, invoiced quarterly" });
  });

  it("issues a trial license forcing business plan with a far-future placeholder expiry", async () => {
    const customer = await User.create({ name: "Trialer", email: `trial${Date.now()}@example.com`, password_hash: "x", role: "customer" });

    const res = await adminAgent.post("/api/admin/licenses").send({
      user_id: customer._id.toString(),
      plan: "pro", // should be overridden server-side — trial is always business
      license_type: "trial",
      trial_duration_days: 180,
    });

    expect(res.status).toBe(201);
    expect(res.body.plan).toBe("business");
    expect(res.body.license_type).toBe("trial");
    expect(res.body.trial_duration_days).toBe(180);
    expect(res.body.expires_at).toBe("2099-12-31");
  });

  it("rejects both user_id and email being provided together", async () => {
    const customer = await User.create({ name: "Customer3", email: `c3${Date.now()}@example.com`, password_hash: "x", role: "customer" });

    const res = await adminAgent
      .post("/api/admin/licenses")
      .send({ user_id: customer._id.toString(), email: "another@example.com", name: "Another", plan: "pro" });

    expect(res.status).toBe(400);
  });

  it("requires admin auth", async () => {
    const res = await request(app).post("/api/admin/licenses").send({ email: "nope@example.com", name: "Nope", plan: "pro" });
    expect(res.status).toBe(401);
  });

  it("license issued to an existing customer is visible via GET /api/licenses/me", async () => {
    const customerAgent = request.agent(app);
    const email = `visible${Date.now()}@example.com`;
    const registerRes = await customerAgent.post("/api/auth/register").send({ name: "Visible", email, password: "password123" });

    const issueRes = await adminAgent.post("/api/admin/licenses").send({ user_id: registerRes.body._id, plan: "pro" });
    expect(issueRes.status).toBe(201);
    const licenses = await License.find({ user_id: registerRes.body._id });
    expect(licenses).toHaveLength(1);

    const meRes = await customerAgent.get("/api/licenses/me");
    expect(meRes.body).toHaveLength(1);
    expect(meRes.body[0].plan).toBe("pro");
  });
});
