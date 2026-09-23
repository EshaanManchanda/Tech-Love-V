import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

const app = createApp();

let adminAgent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  adminAgent = request.agent(app);
  const email = `admin${Date.now()}@example.com`;
  const res = await adminAgent.post("/api/auth/register").send({ name: "Admin", email, password: "password123" });
  await User.updateOne({ _id: res.body._id }, { role: "admin" });
  await adminAgent.post("/api/auth/login").send({ email, password: "password123" });
});

describe("admin products CRUD", () => {
  it("creates a product, rejects a duplicate slug, and lists it", async () => {
    const create = await adminAgent.post("/api/admin/products").send({ name: "Test Plugin", slug: `test-plugin-${Date.now()}`, tagline: "Does things." });
    expect(create.status).toBe(201);

    const dupe = await adminAgent.post("/api/admin/products").send({ name: "Again", slug: create.body.slug });
    expect(dupe.status).toBe(409);

    const list = await adminAgent.get("/api/admin/products");
    expect(list.status).toBe(200);
    expect(list.body.some((p: { _id: string }) => p._id === create.body._id)).toBe(true);
  });

  it("adds a plan scoped to the product and rejects a duplicate slug within it", async () => {
    const product = await adminAgent.post("/api/admin/products").send({ name: "Plan Test", slug: `plan-test-${Date.now()}` });
    const planBody = {
      slug: "pro",
      name: "Pro",
      billing_type: "recurring",
      price_monthly: 9,
      price_yearly: 90,
      cert_limit: 0,
      bulk_cap: 0,
      cta_label: "Upgrade",
      cta_type: "checkout",
    };

    const plan = await adminAgent.post(`/api/admin/products/${product.body._id}/plans`).send(planBody);
    expect(plan.status).toBe(201);

    const dupe = await adminAgent.post(`/api/admin/products/${product.body._id}/plans`).send(planBody);
    expect(dupe.status).toBe(409);
  });

  it("uploads a version zip, marks it current, and serves it on the public product endpoint", async () => {
    const slug = `download-test-${Date.now()}`;
    const product = await adminAgent.post("/api/admin/products").send({ name: "Download Test", slug });

    const upload = await adminAgent
      .post(`/api/admin/products/${product.body._id}/versions`)
      .field("version", "1.0.0")
      .field("changelog", "Initial release")
      .attach("file", Buffer.from("fake zip contents"), "plugin.zip");

    expect(upload.status).toBe(201);
    expect(upload.body.version).toBe("1.0.0");
    expect(upload.body.is_current).toBe(true);

    // Not "active" (default status on create) until we check — Product defaults to active, so it's already public.
    const publicDetail = await request(app).get(`/api/products/${slug}`);
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.current_version).toBe("1.0.0");
  });

  it("rejects a non-zip upload", async () => {
    const product = await adminAgent.post("/api/admin/products").send({ name: "Reject Test", slug: `reject-test-${Date.now()}` });

    const upload = await adminAgent
      .post(`/api/admin/products/${product.body._id}/versions`)
      .field("version", "1.0.0")
      .attach("file", Buffer.from("not a zip"), "plugin.txt");

    expect(upload.status).toBe(400);
  });
});

describe("GET /api/products (public)", () => {
  it("only returns active products", async () => {
    const product = await adminAgent.post("/api/admin/products").send({ name: "Archive Test", slug: `archive-test-${Date.now()}` });
    await adminAgent.patch(`/api/admin/products/${product.body._id}/status`).send({ status: "archived" });

    const list = await request(app).get("/api/products");
    expect(list.body.some((p: { _id: string }) => p._id === product.body._id)).toBe(false);
  });

  // Regression: a product saved before the `versions` field existed on the schema
  // comes back from a .lean() read with that field simply absent, not defaulted to
  // [] (only full document hydration applies schema defaults) — every route reading
  // `.versions` off a lean product must tolerate that, or this 500s instead of 200ing.
  it("doesn't 500 on a legacy product document with no versions field stored", async () => {
    const slug = `legacy-${Date.now()}`;
    await Product.collection.insertOne({ name: "Legacy Product", slug, status: "active", created_at: new Date() });

    const list = await request(app).get("/api/products");
    expect(list.status).toBe(200);
    expect(list.body.find((p: { slug: string }) => p.slug === slug)?.current_version).toBeNull();

    const detail = await request(app).get(`/api/products/${slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.current_version).toBeNull();
  });
});
