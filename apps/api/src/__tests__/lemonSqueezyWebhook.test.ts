import { createHmac } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { License } from "../models/License.js";
import { Plan } from "../models/Plan.js";
import { Product } from "../models/Product.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";

process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "whsec_test";
const app = createApp();

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const day = (isoString: string) => isoString.slice(0, 10);

function send(body: unknown, secret = "whsec_test") {
  const raw = JSON.stringify(body);
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  return request(app).post("/api/webhooks/lemonsqueezy").type("application/json").set("X-Signature", signature).send(raw);
}

function subscriptionAttrs(overrides: Record<string, unknown> = {}) {
  return {
    store_id: 1,
    customer_id: 77,
    order_id: 555,
    variant_id: 1001,
    status: "active",
    cancelled: false,
    renews_at: iso(30),
    ends_at: null,
    user_email: "buyer@example.com",
    created_at: iso(0),
    updated_at: iso(0),
    ...overrides,
  };
}

function subscriptionEvent(name: string, userId: string, attrs: Record<string, unknown> = {}, id = "sub_1") {
  return {
    meta: { event_name: name, custom_data: { user_id: userId, product: "certificate-generator", plan: "pro", cycle: "monthly" } },
    data: { type: "subscriptions", id, attributes: subscriptionAttrs(attrs) },
  };
}

async function makeUser(email = "buyer@example.com") {
  return User.create({ name: "Buyer", email, password_hash: "x", role: "customer" });
}

const fetchMock = vi.fn();

describe("POST /api/webhooks/lemonsqueezy", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("rejects a bad signature", async () => {
    const user = await makeUser();
    const res = await send(subscriptionEvent("subscription_created", user._id.toString()), "wrong-secret");

    expect(res.status).toBe(400);
    expect(await License.countDocuments()).toBe(0);
  });

  it("subscription_created issues a license that runs to renews_at, once even if redelivered", async () => {
    const user = await makeUser();
    const event = subscriptionEvent("subscription_created", user._id.toString());

    await send(event);
    const again = await send(event);

    expect(again.body.deduped).toBe(true);
    const licenses = await License.find({ user_id: user._id });
    expect(licenses).toHaveLength(1);
    expect(licenses[0].license_key).toMatch(/^PRO-/);
    expect(licenses[0].expires_at).toBe(day(event.data.attributes.renews_at as string));

    const subscription = await Subscription.findOne({ provider_subscription_id: "sub_1" });
    expect(subscription).toMatchObject({ provider: "lemonsqueezy", provider_order_id: "555", status: "active", billing_cycle: "monthly" });
    expect(licenses[0].subscription_id?.toString()).toBe(subscription!._id.toString());
    expect((await User.findById(user._id))!.lemonsqueezy_customer_id).toBe("77");
  });

  it("falls back to the buyer's email when the checkout didn't come from us", async () => {
    const user = await makeUser("store-buyer@example.com");
    const event = subscriptionEvent("subscription_created", "", { user_email: "Store-Buyer@example.com" });
    event.meta.custom_data = {} as never;
    await Product.create({ name: "Certificate Generator", slug: "certificate-generator" }).then((product) =>
      Plan.create({
        product_id: product._id,
        slug: "pro",
        name: "Pro",
        billing_type: "recurring",
        cert_limit: 0,
        bulk_cap: 0,
        activation_limit: 1,
        ls_variant_monthly: "1001",
        cta_label: "Buy",
        cta_type: "checkout",
      }),
    );

    await send(event);

    expect(await License.countDocuments({ user_id: user._id })).toBe(1);
  });

  it("a renewal payment moves the license to the new renews_at", async () => {
    const user = await makeUser();
    await send(subscriptionEvent("subscription_created", user._id.toString()));
    const renewsAt = iso(61);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: { id: "sub_1", attributes: subscriptionAttrs({ renews_at: renewsAt, updated_at: iso(1) }) } })));

    await send({
      meta: { event_name: "subscription_payment_success", custom_data: {} },
      data: { type: "subscription-invoices", id: "inv_2", attributes: { subscription_id: "sub_1", billing_reason: "renewal", updated_at: iso(1) } },
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/subscriptions\/sub_1$/), expect.objectContaining({ method: "GET" }));
    expect((await License.findOne({ user_id: user._id }))!.expires_at).toBe(day(renewsAt));
  });

  it("a cancelled subscription keeps the license until ends_at", async () => {
    const user = await makeUser();
    await send(subscriptionEvent("subscription_created", user._id.toString()));
    const endsAt = iso(20);

    await send(subscriptionEvent("subscription_cancelled", user._id.toString(), { status: "cancelled", cancelled: true, ends_at: endsAt, updated_at: iso(1) }));

    const license = await License.findOne({ user_id: user._id });
    expect(license).toMatchObject({ status: "active", expires_at: day(endsAt) });
    expect(await Subscription.findOne({ provider_subscription_id: "sub_1" })).toMatchObject({ status: "active", cancel_at_period_end: true });
  });

  it("a failed payment marks the subscription past_due and leaves the license", async () => {
    const user = await makeUser();
    const created = subscriptionEvent("subscription_created", user._id.toString());
    await send(created);

    await send({
      meta: { event_name: "subscription_payment_failed", custom_data: {} },
      data: { type: "subscription-invoices", id: "inv_f", attributes: { subscription_id: "sub_1", updated_at: iso(1) } },
    });

    expect((await Subscription.findOne({ provider_subscription_id: "sub_1" }))!.status).toBe("past_due");
    expect((await License.findOne({ user_id: user._id }))!.status).toBe("active");
  });

  it("a full refund cancels the license and the subscription, and later updates don't revive it", async () => {
    const user = await makeUser();
    await send(subscriptionEvent("subscription_created", user._id.toString()));
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await send({
      meta: { event_name: "order_refunded", custom_data: {} },
      data: { type: "orders", id: "555", attributes: { refunded: true, updated_at: iso(1) } },
    });
    await send(subscriptionEvent("subscription_updated", user._id.toString(), { status: "cancelled", cancelled: true, ends_at: iso(30), updated_at: iso(2) }));

    expect((await License.findOne({ user_id: user._id }))!.status).toBe("cancelled");
    expect((await Subscription.findOne({ provider_subscription_id: "sub_1" }))!.status).toBe("cancelled");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/subscriptions\/sub_1$/), expect.objectContaining({ method: "DELETE" }));
  });

  it("a partial refund leaves the license alone", async () => {
    const user = await makeUser();
    await send(subscriptionEvent("subscription_created", user._id.toString()));

    await send({
      meta: { event_name: "order_refunded", custom_data: {} },
      data: { type: "orders", id: "555", attributes: { refunded: false, refunded_amount: 100, updated_at: iso(1) } },
    });

    expect((await License.findOne({ user_id: user._id }))!.status).toBe("active");
  });

  it("a plan change at Lemon Squeezy follows onto the license", async () => {
    const user = await makeUser();
    const product = await Product.create({ name: "Certificate Generator", slug: "certificate-generator" });
    const base = { product_id: product._id, billing_type: "recurring", cert_limit: 0, bulk_cap: 0, cta_label: "Buy", cta_type: "checkout" };
    await Plan.create({ ...base, slug: "pro", name: "Pro", activation_limit: 1, ls_variant_monthly: "1001" });
    await Plan.create({ ...base, slug: "business", name: "Business", activation_limit: 5, ls_variant_monthly: "2002" });
    await send(subscriptionEvent("subscription_created", user._id.toString()));

    await send(subscriptionEvent("subscription_updated", user._id.toString(), { variant_id: 2002, updated_at: iso(1) }));

    expect(await License.findOne({ user_id: user._id })).toMatchObject({ plan: "business", activation_limit: 5 });
  });
});
