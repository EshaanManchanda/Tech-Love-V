import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { License } from "../models/License.js";
import { Plan } from "../models/Plan.js";
import { Product } from "../models/Product.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { signAccessToken } from "../services/authService.js";

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

const fetchMock = vi.fn();
const json = (body: unknown) => new Response(JSON.stringify(body));
const calls = () => fetchMock.mock.calls.map(([url, init]) => `${(init as RequestInit).method} ${String(url).replace("https://api.lemonsqueezy.com/v1", "")}`);

async function makeUser(role: "customer" | "admin" = "customer") {
  const user = await User.create({ name: "Buyer", email: `${role}${Date.now()}${Math.random()}@example.com`, password_hash: "x", role });
  const cookie = `access_token=${signAccessToken({ sub: user._id.toString(), role })}`;
  return { user, cookie };
}

/** An LS subscription bought `ageDays` ago, with its license. */
async function makeSubscription(userId: unknown, ageDays: number, overrides: Record<string, unknown> = {}) {
  const subscription = await Subscription.create({
    user_id: userId,
    product: "certificate-generator",
    plan: "pro",
    provider: "lemonsqueezy",
    provider_subscription_id: `sub_${Math.random()}`,
    provider_order_id: "555",
    provider_price_id: "1001",
    status: "active",
    billing_cycle: "monthly",
    current_period_start: new Date(Date.now() - ageDays * DAY),
    current_period_end: new Date(Date.now() + (30 - ageDays) * DAY),
    created_at: new Date(Date.now() - ageDays * DAY),
    ...overrides,
  });
  const license = await License.create({
    license_key: `PRO-${Math.random()}`,
    user_id: userId,
    subscription_id: subscription._id,
    product: "certificate-generator",
    plan: "pro",
    status: "active",
    activation_limit: 1,
    expires_at: iso(30 - ageDays).slice(0, 10),
  });
  return { subscription, license };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    json({ data: { id: "555", attributes: /\/refund$/.test(url) ? { total: 24872, refunded_amount: 24872 } : {} } }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/subscriptions/:id/cancel", () => {
  it("within 7 days: refunds the order in full, cancels at LS, and cancels the license now", async () => {
    const { user, cookie } = await makeUser();
    const { subscription, license } = await makeSubscription(user._id, 2);

    const res = await request(app).post(`/api/subscriptions/${subscription._id}/cancel`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.refunded).toBe(true);
    expect(calls()).toEqual(["POST /orders/555/refund", `DELETE /subscriptions/${subscription.provider_subscription_id}`]);
    expect((await License.findById(license._id))!.status).toBe("cancelled");
    expect((await Subscription.findById(subscription._id))!.status).toBe("cancelled");
  });

  it("after 7 days: no refund, the license keeps working until the period ends", async () => {
    const { user, cookie } = await makeUser();
    const { subscription, license } = await makeSubscription(user._id, 10);

    const res = await request(app).post(`/api/subscriptions/${subscription._id}/cancel`).set("Cookie", cookie);

    expect(res.body.refunded).toBe(false);
    expect(calls()).toEqual([`DELETE /subscriptions/${subscription.provider_subscription_id}`]);
    expect((await License.findById(license._id))!.status).toBe("active");
    expect((await Subscription.findById(subscription._id))!.cancel_at_period_end).toBe(true);
  });

  it("no automatic refund for a customer who already had one for this product", async () => {
    const { user, cookie } = await makeUser();
    await makeSubscription(user._id, 40, { status: "cancelled" });
    const { subscription } = await makeSubscription(user._id, 1);

    const me = await request(app).get("/api/subscriptions/me").set("Cookie", cookie);
    expect(me.body.find((s: { _id: string }) => s._id === subscription._id.toString()).refund_eligible_until).toBeNull();

    const res = await request(app).post(`/api/subscriptions/${subscription._id}/cancel`).set("Cookie", cookie);
    expect(res.body.refunded).toBe(false);
    expect(calls()).not.toContain("POST /orders/555/refund");
  });

  it("can't touch someone else's subscription", async () => {
    const { user } = await makeUser();
    const { cookie: otherCookie } = await makeUser();
    const { subscription } = await makeSubscription(user._id, 1);

    const res = await request(app).post(`/api/subscriptions/${subscription._id}/cancel`).set("Cookie", otherCookie);

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resume undoes a period-end cancel", async () => {
    const { user, cookie } = await makeUser();
    const { subscription } = await makeSubscription(user._id, 10, { cancel_at_period_end: true });

    const res = await request(app).post(`/api/subscriptions/${subscription._id}/resume`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(calls()).toEqual([`PATCH /subscriptions/${subscription.provider_subscription_id}`]);
    expect((await Subscription.findById(subscription._id))!.cancel_at_period_end).toBe(false);
  });
});

describe("POST /api/admin/subscriptions/:id/refund", () => {
  it("refunds past the 7-day window", async () => {
    const { user } = await makeUser();
    const { cookie: adminCookie } = await makeUser("admin");
    const { subscription, license } = await makeSubscription(user._id, 20);

    const res = await request(app).post(`/api/admin/subscriptions/${subscription._id}/refund`).set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(calls()).toContain("POST /orders/555/refund");
    expect((await License.findById(license._id))!.status).toBe("cancelled");
  });
});

describe("POST /api/billing/sync", () => {
  it("issues the license for a purchase whose webhook never arrived, once", async () => {
    const { user, cookie } = await makeUser();
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
      cta_label: "Buy",
      cta_type: "checkout",
    });
    const lsSubscription = {
      id: "sub_lost",
      attributes: {
        store_id: 1, customer_id: 77, order_id: 999, variant_id: 1001, status: "active", cancelled: false,
        renews_at: iso(30), ends_at: null, user_email: user.email, created_at: iso(0), updated_at: iso(0),
      },
    };
    fetchMock.mockImplementation(async () => json({ data: [lsSubscription] }));

    const first = await request(app).post("/api/billing/sync").set("Cookie", cookie);
    await request(app).post("/api/billing/sync").set("Cookie", cookie);

    expect(first.body.found).toBe(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(`filter%5Buser_email%5D=${encodeURIComponent(user.email)}`);
    expect(await License.countDocuments({ user_id: user._id })).toBe(1);
    expect(await Subscription.findOne({ provider_subscription_id: "sub_lost" })).toMatchObject({ provider_order_id: "999", status: "active" });
  });
});

describe("GET /api/licenses/me", () => {
  it("reports an active license past its expiry as expired", async () => {
    const { user, cookie } = await makeUser();
    await License.create({ license_key: "PRO-OLD", user_id: user._id, plan: "pro", status: "active", activation_limit: 1, expires_at: iso(-3).slice(0, 10) });

    const res = await request(app).get("/api/licenses/me").set("Cookie", cookie);

    expect(res.body[0].status).toBe("expired");
  });
});
