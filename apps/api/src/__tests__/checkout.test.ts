import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../services/payments/stripe.provider.js", () => ({
  stripeProvider: { createCheckout: vi.fn().mockResolvedValue({ url: "https://stripe.test/checkout" }) },
}));

const { createApp } = await import("../app.js");
const { stripeProvider } = await import("../services/payments/stripe.provider.js");
const { Coupon } = await import("../models/Coupon.js");

const app = createApp();

async function registerUser(name: string) {
  const agent = request.agent(app);
  const email = `${name}${Date.now()}${Math.random()}@example.com`.toLowerCase();
  await agent.post("/api/auth/register").send({ name, email, password: "password123" });
  return agent;
}

describe("POST /api/checkout/session — coupons", () => {
  it("rejects an unknown coupon code without creating a checkout session", async () => {
    const agent = await registerUser("Buyer");

    const res = await agent.post("/api/checkout/session").send({ plan: "pro", billing_cycle: "monthly", coupon_code: "NOPE" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_COUPON");
    expect(stripeProvider.createCheckout).not.toHaveBeenCalled();
  });

  it("rejects a coupon not applicable to the requested plan", async () => {
    const agent = await registerUser("Buyer2");
    await Coupon.create({
      code: "BUSINESSONLY",
      stripe_coupon_id: "coupon_biz",
      type: "percentage",
      value: 50,
      applicable_plans: ["business"],
    });

    const res = await agent.post("/api/checkout/session").send({ plan: "pro", billing_cycle: "monthly", coupon_code: "BUSINESSONLY" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("COUPON_NOT_APPLICABLE");
  });

  it("rejects an exhausted coupon", async () => {
    const agent = await registerUser("Buyer3");
    await Coupon.create({
      code: "MAXEDOUT",
      stripe_coupon_id: "coupon_maxed",
      type: "percentage",
      value: 10,
      max_redemptions: 1,
      redemption_count: 1,
      applicable_plans: ["pro", "business"],
    });

    const res = await agent.post("/api/checkout/session").send({ plan: "pro", billing_cycle: "monthly", coupon_code: "MAXEDOUT" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("COUPON_EXHAUSTED");
  });

  it("resolves a valid coupon to its Stripe coupon id and passes it through", async () => {
    const agent = await registerUser("Buyer4");
    await Coupon.create({
      code: "SAVE20",
      stripe_coupon_id: "coupon_save20",
      type: "percentage",
      value: 20,
      applicable_plans: ["pro", "business"],
    });

    const res = await agent.post("/api/checkout/session").send({ plan: "pro", billing_cycle: "monthly", coupon_code: "save20" });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://stripe.test/checkout");
    expect(stripeProvider.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ providerCouponId: "coupon_save20" }));
  });
});
