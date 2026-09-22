import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { License } from "../models/License.js";
import { Plan } from "../models/Plan.js";
import { Product } from "../models/Product.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";

const app = createApp();

async function registerAdmin(name: string) {
  const agent = request.agent(app);
  const email = `${name}${Date.now()}${Math.random()}@example.com`.toLowerCase();
  const res = await agent.post("/api/auth/register").send({ name, email, password: "password123" });
  await User.updateOne({ _id: res.body._id }, { role: "admin" });
  await agent.post("/api/auth/login").send({ email, password: "password123" });
  return agent;
}

describe("GET /api/admin/analytics/overview", () => {
  it("computes MRR/ARR and plan distribution from active subscriptions", async () => {
    const adminAgent = await registerAdmin("AnalyticsAdmin");

    const product = await Product.create({ name: "Certificate Generator", slug: "certificate-generator" });
    await Plan.create({
      product_id: product._id,
      slug: "pro",
      name: "Pro",
      billing_type: "recurring",
      price_monthly: 2,
      price_yearly: 20,
      cert_limit: 1000,
      bulk_cap: 0,
      activation_limit: 1,
      cta_label: "Subscribe",
      cta_type: "checkout",
      sort_order: 2,
    });

    const buyer = await User.create({ name: "Buyer", email: `buyer${Date.now()}@example.com`, password_hash: "x", role: "customer" });
    const sub = await Subscription.create({
      user_id: buyer._id,
      plan: "pro",
      provider: "stripe",
      provider_subscription_id: `sub_${Date.now()}`,
      provider_price_id: "price_pro_monthly",
      status: "active",
      billing_cycle: "monthly",
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await License.create({
      license_key: `CG-TEST-${Date.now()}`,
      user_id: buyer._id,
      subscription_id: sub._id,
      plan: "pro",
      status: "active",
      activation_limit: 1,
      expires_at: "2099-01-01",
    });

    const res = await adminAgent.get("/api/admin/analytics/overview");

    expect(res.status).toBe(200);
    expect(res.body.mrr).toBe(2);
    expect(res.body.arr).toBe(24);
    expect(res.body.planDistribution).toMatchObject({ pro: 1 });
    expect(res.body.licensesByStatus).toMatchObject({ active: 1 });
    expect(res.body.totalCustomers).toBeGreaterThanOrEqual(1);
  });
});
