import request from "supertest";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { Plan } from "../models/Plan.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

const app = createApp();
let adminAgent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  adminAgent = request.agent(app);
  const email = `planadmin${Date.now()}@example.com`;
  const res = await adminAgent.post("/api/auth/register").send({ name: "Admin", email, password: "password123" });
  await User.updateOne({ _id: res.body._id }, { role: "admin" });
  await adminAgent.post("/api/auth/login").send({ email, password: "password123" });
});

// The store as LS's GET /variants/:id would answer.
const VARIANTS: Record<string, object> = {
  "5001": { name: "Pro monthly", price: 24900, is_subscription: true, interval: "month", status: "published" },
  "5002": { name: "Pro yearly", price: 249900, is_subscription: true, interval: "year", status: "published" },
};
const fetchMock = vi.fn(async (url: string) => {
  if (url.includes("/stores/")) return new Response(JSON.stringify({ data: { id: "42", attributes: { currency: "INR" } } }));
  const id = url.split("/").pop()!;
  return VARIANTS[id]
    ? new Response(JSON.stringify({ data: { id, attributes: VARIANTS[id] } }))
    : new Response(JSON.stringify({ errors: [{ status: "404" }] }), { status: 404 });
});

describe("admin plan Lemon Squeezy variant ids are checked on save", () => {
  let productId: string;
  let planId: string;

  beforeEach(async () => {
    process.env.LEMONSQUEEZY_API_KEY = "test";
    vi.stubGlobal("fetch", fetchMock);
    const product = await Product.create({ name: "Certificate Generator", slug: "certificate-generator" });
    productId = product._id.toString();
    const plan = await Plan.create({
      product_id: product._id,
      slug: "pro",
      name: "Pro",
      billing_type: "recurring",
      price_monthly: 249,
      price_yearly: 2499,
      cert_limit: 0,
      bulk_cap: 0,
      cta_label: "Subscribe",
      cta_type: "checkout",
    });
    planId = plan._id.toString();
  });

  afterEach(() => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    vi.unstubAllGlobals();
  });

  const save = (body: object) => adminAgent.patch(`/api/admin/products/${productId}/plans/${planId}`).send(body);

  it("refuses a price typed into the variant id field", async () => {
    const res = await save({ ls_variant_monthly: "249" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_VARIANT");
    expect(res.body.error.message).toMatch(/no variant 249/);
    expect((await Plan.findById(planId))!.ls_variant_monthly).toBeUndefined();
  });

  it("refuses a yearly variant in the monthly field, and a price that doesn't match", async () => {
    const swapped = await save({ ls_variant_monthly: "5002" });
    const priced = await save({ ls_variant_monthly: "5001", price_monthly: 199 });

    expect(swapped.body.error.message).toMatch(/isn't a monthly subscription/);
    expect(priced.body.error.message).toMatch(/costs 249 in Lemon Squeezy but the monthly price here is 199/);
  });

  it("refuses a USD plan on an INR store, and accepts switching it to INR", async () => {
    // What production had: rupee amounts and variants, but the plan still marked "usd", so the site showed $249.
    await Plan.updateOne({ _id: planId }, { currency: "usd" });

    const usd = await save({ ls_variant_monthly: "5001" });
    const inr = await save({ ls_variant_monthly: "5001", currency: "INR" });

    expect(usd.status).toBe(400);
    expect(usd.body.error.message).toMatch(/currency is USD, but your Lemon Squeezy store charges in INR/);
    expect(inr.status).toBe(200);
    expect(inr.body.currency).toBe("inr");
  });

  it("saves matching variants, and an emptied field clears the id", async () => {
    const ok = await save({ ls_variant_monthly: "5001", ls_variant_yearly: "5002" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ ls_variant_monthly: "5001", ls_variant_yearly: "5002" });

    const cleared = await save({ ls_variant_yearly: "" });
    expect(cleared.status).toBe(200);
    expect((await Plan.findById(planId))!.ls_variant_yearly).toBeUndefined();
    expect((await Plan.findById(planId))!.ls_variant_monthly).toBe("5001");
  });
});
