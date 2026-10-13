import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// No Redis in tests: capture what the job would enqueue instead.
const added: { name: string; data: { type: string } }[] = [];
vi.mock("../queues.js", () => ({
  emailQueue: { add: async (name: string, data: { type: string }) => void added.push({ name, data }) },
}));

const { runRenewalReminders } = await import("./renewalReminders.js");
const { License } = await import("../models/License.js");
const { Subscription } = await import("../models/Subscription.js");
const { User } = await import("../models/User.js");

// Same docker Mongo as apps/api's tests (`docker compose up -d mongo`), its own database.
const TEST_URI = process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017/certificate-license-platform-worker-test";
const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

beforeAll(() => mongoose.connect(TEST_URI));
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  added.length = 0;
  for (const collection of Object.values(mongoose.connection.collections)) await collection.deleteMany({});
});

async function licenseExpiringIn(days: number, subscription?: { status: string; cancel_at_period_end: boolean }) {
  const user = await User.create({ name: "Buyer", email: `b${Math.random()}@example.com` });
  const sub = subscription && (await Subscription.create(subscription));
  return License.create({ user_id: user._id, plan: "pro", status: "active", expires_at: inDays(days), subscription_id: sub?._id });
}

describe("runRenewalReminders", () => {
  it("doesn't warn an auto-renewing subscriber that their license is expiring", async () => {
    await licenseExpiringIn(7, { status: "active", cancel_at_period_end: false });
    expect(await runRenewalReminders()).toBe(0);
  });

  it("warns when the subscription won't renew, and for a license with no subscription", async () => {
    await licenseExpiringIn(7, { status: "active", cancel_at_period_end: true });
    await licenseExpiringIn(3);
    expect(await runRenewalReminders()).toBe(2);
    expect(added.map((a) => a.data.type)).toEqual(["license-expiring", "license-expiring"]);
  });

  it("sends the expired email once, the day after expiry", async () => {
    await licenseExpiringIn(-1, { status: "expired", cancel_at_period_end: false });
    await runRenewalReminders();
    await runRenewalReminders();
    expect(added.map((a) => a.data.type)).toEqual(["license-expired"]);
  });
});
