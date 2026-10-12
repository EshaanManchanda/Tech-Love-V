import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/payments/stripe.provider.js", () => ({
  stripeProvider: { createCheckout: vi.fn().mockResolvedValue({ url: "https://stripe.test/checkout" }) },
}));

// Legacy env-configured price for the original "pro" plan (no Plan document needed).
process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_monthly";

const { createApp } = await import("../app.js");
const { stripeProvider } = await import("../services/payments/stripe.provider.js");
const { Coupon } = await import("../models/Coupon.js");
const { Plan } = await import("../models/Plan.js");
const { Product } = await import("../models/Product.js");

const app = createApp();

async function registerUser(name: string) {
  const agent = request.agent(app);
  const email = `${name}${Date.now()}${Math.random()}@example.com`.toLowerCase();
  await agent.post("/api/auth/register").send({ name, email, password: "password123" });
  return agent;
}

describe("POST /api/checkout/session â€” coupons", () => {
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

describe("POST /api/checkout/session â€” any product", () => {
  async function seedPlan(slug: string, stripePriceMonthly?: string) {
    const product = await Product.create({ name: `Product ${slug}`, slug });
    await Plan.create({
      product_id: product._id,
      slug: "team",
      name: "Team",
      billing_type: "recurring",
      price_monthly: 5,
      price_yearly: 50,
      cert_limit: 0,
      bulk_cap: 0,
      activation_limit: 3,
      stripe_price_monthly: stripePriceMonthly,
      cta_label: "Subscribe",
      cta_type: "checkout",
    });
  }

  it("checks out a new product's plan with its own Stripe price and tags the session", async () => {
    await seedPlan("seo-toolkit", "price_seo_team_monthly");
    const agent = await registerUser("Buyer5");

    const res = await agent.post("/api/checkout/session").send({ product: "seo-toolkit", plan: "team", billing_cycle: "monthly" });

    expect(res.status).toBe(200);
    expect(stripeProvider.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        priceId: "price_seo_team_monthly",
        metadata: expect.objectContaining({ product: "seo-toolkit", plan: "team" }),
        cancelUrl: expect.stringContaining("/plugins/seo-toolkit"),
      }),
    );
  });

  it("refuses a plan that has no Stripe price for the requested cycle", async () => {
    await seedPlan("unpriced-plugin");
    const agent = await registerUser("Buyer6");

    const res = await agent.post("/api/checkout/session").send({ product: "unpriced-plugin", plan: "team", billing_cycle: "monthly" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PLAN_NOT_PURCHASABLE");
  });

  it("refuses an unknown plan", async () => {
    const agent = await registerUser("Buyer7");
    const res = await agent.post("/api/checkout/session").send({ product: "nope", plan: "team", billing_cycle: "monthly" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/checkout/session â€” Lemon Squeezy", () => {
  const fetchMock = vi.fn();

  beforeEach(async () => {
    process.env.PAYMENT_PROVIDER = "lemonsqueezy";
    process.env.LEMONSQUEEZY_STORE_ID = "42";
    vi.mocked(stripeProvider.createCheckout).mockClear();
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ data: { id: "chk_1", attributes: { url: "https://shop.lemonsqueezy.com/checkout/abc" } } })));
    vi.stubGlobal("fetch", fetchMock);
    const product = await Product.create({ name: "Certificate Generator", slug: "certificate-generator" });
    await Plan.create({
      product_id: product._id,
      slug: "pro",
      name: "Pro",
      billing_type: "recurring",
      cert_limit: 0,
      bulk_cap: 0,
      activation_limit: 1,
      ls_variant_monthly: "1001",
      cta_label: "Subscribe",
      cta_type: "checkout",
    });
  });

  afterEach(() => {
    delete process.env.PAYMENT_PROVIDER;
    vi.unstubAllGlobals();
  });

  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string).data;

  it("creates a checkout for the plan's variant with our ids in custom data", async () => {
    const agent = await registerUser("LsBuyer");

    const res = await agent.post("/api/checkout/session").send({ product: "certificate-generator", plan: "pro", billing_cycle: "monthly" });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://shop.lemonsqueezy.com/checkout/abc");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.lemonsqueezy.com/v1/checkouts");
    const body = sentBody();
    expect(body.relationships).toMatchObject({ store: { data: { id: "42" } }, variant: { data: { id: "1001" } } });
    expect(body.attributes.checkout_data.custom).toMatchObject({ product: "certificate-generator", plan: "pro", cycle: "monthly" });
    expect(body.attributes.checkout_data.custom.user_id).toBeTruthy();
    expect(stripeProvider.createCheckout).not.toHaveBeenCalled();
  });

  it("passes a coupon as its Lemon Squeezy discount code", async () => {
    const agent = await registerUser("LsBuyer2");
    await Coupon.create({ code: "LAUNCH10", ls_discount_code: "LAUNCH10", type: "percentage", value: 10, applicable_plans: ["pro"] });

    await agent.post("/api/checkout/session").send({ product: "certificate-generator", plan: "pro", billing_cycle: "monthly", coupon_code: "launch10" });

    expect(sentBody().attributes.checkout_data.discount_code).toBe("LAUNCH10");
  });

  it("answers 502 with a plain message when Lemon Squeezy refuses the checkout", async () => {
    const agent = await registerUser("LsBuyer4");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ errors: [{ detail: "The related resource does not exist." }] }), { status: 404 }));

    const res = await agent.post("/api/checkout/session").send({ product: "certificate-generator", plan: "pro", billing_cycle: "monthly" });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("CHECKOUT_UNAVAILABLE");
  });

  it("refuses a cycle with no variant set up", async () => {
    const agent = await registerUser("LsBuyer3");

    const res = await agent.post("/api/checkout/session").send({ product: "certificate-generator", plan: "pro", billing_cycle: "yearly" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PLAN_NOT_PURCHASABLE");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
