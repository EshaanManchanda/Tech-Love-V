import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Product } from "../models/Product.js";
import { Plan } from "../models/Plan.js";

const app = createApp();

async function seedProductWithPlan(slug: string, name: string, planSlug: "free" | "pro" | "paid") {
  const product = await Product.create({ name, slug, status: "active" });
  await Plan.create({
    product_id: product._id,
    slug: planSlug,
    name: planSlug,
    billing_type: "free",
    price_monthly: 0,
    price_yearly: 0,
    currency: "usd",
    cert_limit: 0,
    bulk_cap: 0,
    activation_limit: 0,
    cta_label: "Go",
    cta_type: "register",
    status: "active",
  });
}

describe("GET /api/plans/compare", () => {
  it("scopes plans to the requested product, not the whole catalog", async () => {
    await seedProductWithPlan("certificate-generator", "Certificate Generator", "pro");
    await seedProductWithPlan("dynamic-tags", "Dynamic Tags", "paid");

    const res = await request(app).get("/api/plans/compare?product=dynamic-tags");

    expect(res.status).toBe(200);
    expect(res.body.plans).toHaveLength(1);
    expect(res.body.plans[0].slug).toBe("paid");
  });
});
