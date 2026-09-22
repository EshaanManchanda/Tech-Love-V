import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { License } from "../models/License.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";

vi.mock("../services/stripeClient.js", () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
  },
  planForPriceId: vi.fn(() => "pro"),
}));

const { stripe, planForPriceId } = await import("../services/stripeClient.js");
const app = createApp();

function checkoutCompletedEvent(id: string, userId: string) {
  return {
    id,
    type: "checkout.session.completed",
    data: { object: { client_reference_id: userId, subscription: "sub_123", customer: "cus_123" } },
  };
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      id: "sub_123",
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      items: { data: [{ price: { id: "price_pro_monthly", recurring: { interval: "month" } } }] },
    } as never);
  });

  it("creates exactly one license even if Stripe delivers the same event twice", async () => {
    const user = await User.create({ name: "Buyer", email: "buyer@example.com", password_hash: "x", role: "customer" });
    const event = checkoutCompletedEvent("evt_dup_1", user._id.toString());
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);

    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");
    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");

    const licenses = await License.find({ user_id: user._id });
    expect(licenses).toHaveLength(1);
  });

  it("creates a Subscription doc and links the License to it via subscription_id", async () => {
    const user = await User.create({ name: "Buyer2", email: "buyer2@example.com", password_hash: "x", role: "customer" });
    const event = checkoutCompletedEvent("evt_sub_link", user._id.toString());
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);

    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");

    const subscription = await Subscription.findOne({ provider_subscription_id: "sub_123" });
    const license = await License.findOne({ user_id: user._id });
    expect(subscription).not.toBeNull();
    expect(subscription!.status).toBe("active");
    expect(subscription!.billing_cycle).toBe("monthly");
    expect(license!.subscription_id?.toString()).toBe(subscription!._id.toString());
    expect(license!.license_key).toMatch(/^PRO-/);
  });
});

describe("plan-scoped license key prefixes", () => {
  it("prefixes a Business license key with BIZ-", async () => {
    vi.mocked(planForPriceId).mockReturnValueOnce("business");
    const user = await User.create({ name: "BizBuyer", email: "bizbuyer@example.com", password_hash: "x", role: "customer" });
    const event = checkoutCompletedEvent("evt_biz_checkout", user._id.toString());
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);

    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");

    const license = await License.findOne({ user_id: user._id });
    expect(license!.license_key).toMatch(/^BIZ-/);
  });
});

describe("Dynamic Tags product", () => {
  it("creates a dynamic-tags/paid License with a DT- prefixed key", async () => {
    vi.mocked(planForPriceId).mockReturnValueOnce("paid");
    const user = await User.create({ name: "DTBuyer", email: "dtbuyer@example.com", password_hash: "x", role: "customer" });
    const event = checkoutCompletedEvent("evt_dt_checkout", user._id.toString());
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);

    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");

    const license = await License.findOne({ user_id: user._id });
    expect(license).toMatchObject({ product: "dynamic-tags", plan: "paid" });
    expect(license!.license_key).toMatch(/^DT-/);
  });
});

describe("invoice.paid", () => {
  it("renews the license's expires_at via the linked Subscription", async () => {
    const user = await User.create({ name: "Renewer", email: "renewer@example.com", password_hash: "x", role: "customer" });
    const checkoutEvent = checkoutCompletedEvent("evt_renew_checkout", user._id.toString());
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(checkoutEvent as never);
    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");

    const originalLicense = await License.findOne({ user_id: user._id });
    const newPeriodEnd = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60;
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      id: "sub_123",
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: newPeriodEnd,
      items: { data: [{ price: { id: "price_pro_monthly", recurring: { interval: "month" } } }] },
    } as never);
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_invoice_paid",
      type: "invoice.paid",
      data: { object: { subscription: "sub_123" } },
    } as never);

    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");

    const renewedLicense = await License.findById(originalLicense!._id);
    expect(renewedLicense!.expires_at).not.toBe(originalLicense!.expires_at);
    expect(renewedLicense!.expires_at).toBe(new Date(newPeriodEnd * 1000).toISOString().slice(0, 10));
  });
});

describe("customer.subscription.deleted", () => {
  it("marks the Subscription cancelled but leaves the License's status/expiry untouched", async () => {
    const user = await User.create({ name: "Canceller", email: "canceller@example.com", password_hash: "x", role: "customer" });
    const checkoutEvent = checkoutCompletedEvent("evt_cancel_checkout", user._id.toString());
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(checkoutEvent as never);
    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");

    const licenseBefore = await License.findOne({ user_id: user._id });
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: "evt_sub_deleted",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_123" } },
    } as never);

    await request(app).post("/api/webhooks/stripe").type("application/json").set("stripe-signature", "test").send("{}");

    const subscription = await Subscription.findOne({ provider_subscription_id: "sub_123" });
    const licenseAfter = await License.findById(licenseBefore!._id);
    expect(subscription!.status).toBe("cancelled");
    expect(licenseAfter!.status).toBe("active");
    expect(licenseAfter!.expires_at).toBe(licenseBefore!.expires_at);
  });
});
