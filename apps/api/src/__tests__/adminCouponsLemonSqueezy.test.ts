import request from "supertest";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { Coupon } from "../models/Coupon.js";
import { Plan } from "../models/Plan.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

const app = createApp();
let adminAgent: ReturnType<typeof request.agent>;

// One admin login for the file: /api/auth/login is rate-limited, and the JWT outlives the per-test DB wipe.
beforeAll(async () => {
  adminAgent = request.agent(app);
  const email = `lsadmin${Date.now()}@example.com`;
  const res = await adminAgent.post("/api/auth/register").send({ name: "Admin", email, password: "password123" });
  await User.updateOne({ _id: res.body._id }, { role: "admin" });
  await adminAgent.post("/api/auth/login").send({ email, password: "password123" });
});

const fetchMock = vi.fn();
const lsCall = (method: string) => fetchMock.mock.calls.find(([, init]) => init.method === method);

describe("admin coupons with Lemon Squeezy", () => {
  beforeEach(async () => {
    process.env.PAYMENT_PROVIDER = "lemonsqueezy";
    process.env.LEMONSQUEEZY_STORE_ID = "42";
    fetchMock.mockReset().mockImplementation(async (_url: string, init: { method: string }) =>
      init.method === "DELETE" ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ data: { id: "disc_9", attributes: {} } })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const product = await Product.create({ name: "Certificate Generator", slug: "certificate-generator" });
    const base = { product_id: product._id, billing_type: "recurring", cert_limit: 0, bulk_cap: 0, cta_label: "Buy", cta_type: "checkout" };
    await Plan.create({ ...base, slug: "pro", name: "Pro", ls_variant_monthly: "1001", ls_variant_yearly: "1002" });
    await Plan.create({ ...base, slug: "business", name: "Business", ls_variant_monthly: "2001" });
  });

  afterEach(() => {
    delete process.env.PAYMENT_PROVIDER;
    vi.unstubAllGlobals();
  });

  it("creates the discount in Lemon Squeezy, limited to the chosen plans' variants", async () => {
    const res = await adminAgent.post("/api/admin/coupons").send({ code: "diwali20", type: "percentage", value: 20, applicable_plans: ["pro"] });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ code: "DIWALI20", ls_discount_code: "DIWALI20", ls_discount_id: "disc_9" });
    const [url, init] = lsCall("POST")!;
    expect(url).toBe("https://api.lemonsqueezy.com/v1/discounts");
    const body = JSON.parse(init.body).data;
    expect(body.attributes).toMatchObject({ code: "DIWALI20", amount: 20, amount_type: "percent", duration: "once", is_limited_to_products: true });
    expect(body.relationships.variants.data.map((v: { id: string }) => v.id)).toEqual(["1001", "1002"]);
  });

  it("makes free months a 100% discount repeating for that many months", async () => {
    await adminAgent.post("/api/admin/coupons").send({ code: "TWOFREE", type: "free_months", value: 2, applicable_plans: ["pro", "business"] });

    const body = JSON.parse(lsCall("POST")![1].body).data;
    expect(body.attributes).toMatchObject({ amount: 100, amount_type: "percent", duration: "repeating", duration_in_months: 2 });
    expect(body.relationships.variants.data).toHaveLength(3);
  });

  it("refuses plans that have no Lemon Squeezy variant yet, and free trials", async () => {
    await Plan.updateMany({}, { $unset: { ls_variant_monthly: 1, ls_variant_yearly: 1 } });
    const noVariant = await adminAgent.post("/api/admin/coupons").send({ code: "X1", type: "percentage", value: 10, applicable_plans: ["pro"] });
    const trial = await adminAgent.post("/api/admin/coupons").send({ code: "X2", type: "free_trial", value: 7, applicable_plans: ["pro"] });

    expect(noVariant.status).toBe(400);
    expect(trial.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await Coupon.countDocuments()).toBe(0);
  });

  it("disabling a coupon deletes its discount in Lemon Squeezy", async () => {
    const coupon = await Coupon.create({ code: "OLD10", ls_discount_code: "OLD10", ls_discount_id: "disc_5", type: "percentage", value: 10 });

    const res = await adminAgent.post(`/api/admin/coupons/${coupon._id}/disable`);

    expect(res.status).toBe(200);
    expect(lsCall("DELETE")![0]).toBe("https://api.lemonsqueezy.com/v1/discounts/disc_5");
    expect((await Coupon.findById(coupon._id))!.status).toBe("disabled");
  });
});
