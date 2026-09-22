import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { AuditLog } from "../models/AuditLog.js";
import { FeatureFlag } from "../models/FeatureFlag.js";
import { License } from "../models/License.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { isFeatureEnabled } from "../services/featureFlagService.js";

const app = createApp();

async function registerUser(name: string) {
  const agent = request.agent(app);
  const email = `${name}${Date.now()}${Math.random()}@example.com`.toLowerCase();
  const res = await agent.post("/api/auth/register").send({ name, email, password: "password123" });
  return { agent, user: res.body as { _id: string; email: string }, email };
}

/** Promotes a just-registered user to admin, then re-logs-in so the JWT actually carries the new role. */
async function registerAdmin(name: string) {
  const { agent, user, email } = await registerUser(name);
  await User.updateOne({ _id: user._id }, { role: "admin" });
  await agent.post("/api/auth/login").send({ email, password: "password123" });
  return { agent, user };
}

async function makeLicenseFor(userId: string) {
  return License.create({
    license_key: `CG-TEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    user_id: userId,
    plan: "pro",
    activation_limit: 1,
    expires_at: "2099-01-01",
  });
}

describe("audit logging on admin actions", () => {
  it("records who did what when a license is disabled, and it's visible via GET /api/admin/logs", async () => {
    const { agent: adminAgent } = await registerAdmin("Admin1");
    const { user: customer } = await registerUser("Customer1");
    const license = await makeLicenseFor(customer._id);

    await adminAgent.post(`/api/admin/licenses/${license._id}/disable`);

    const stored = await AuditLog.findOne({ action: "license.disable", resource_id: license._id.toString() });
    expect(stored).not.toBeNull();

    const res = await adminAgent.get("/api/admin/logs");
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ action: "license.disable", resource_id: license._id.toString() });
  });

  it("records before/after values for a license extension", async () => {
    const { agent: adminAgent } = await registerAdmin("Admin2");
    const { user: customer } = await registerUser("Customer2");
    const license = await makeLicenseFor(customer._id);

    await adminAgent.post(`/api/admin/licenses/${license._id}/extend`).send({ days: 30 });

    const stored = await AuditLog.findOne({ action: "license.extend", resource_id: license._id.toString() });
    expect(stored!.before).toMatchObject({ expires_at: "2099-01-01" });
    expect(stored!.after).toMatchObject({ expires_at: "2099-01-31" });
  });
});

describe("POST /api/admin/users/:id/impersonate", () => {
  it("gives the admin a working session as the target user, and logs it", async () => {
    const { agent: adminAgent } = await registerAdmin("Admin3");
    const { user: target } = await registerUser("Target");

    const res = await adminAgent.post(`/api/admin/users/${target._id}/impersonate`);
    expect(res.status).toBe(200);
    expect(res.body.impersonating._id).toBe(target._id);

    const me = await adminAgent.get("/api/auth/me");
    expect(me.body._id).toBe(target._id);

    const log = await AuditLog.findOne({ action: "user.impersonate", resource_id: target._id });
    expect(log).not.toBeNull();
  });
});

describe("API keys", () => {
  it("returns the raw key only once, never exposes the hash, and revoke removes it from the list", async () => {
    const { agent } = await registerUser("KeyOwner");

    const created = await agent.post("/api/api-keys").send({ name: "CI key" });
    expect(created.status).toBe(201);
    expect(created.body.key).toMatch(/^cgsk_/);

    const list = await agent.get("/api/api-keys");
    expect(list.body).toHaveLength(1);
    expect(list.body[0].key_hash).toBeUndefined();
    expect(list.body[0].key).toBeUndefined();

    await agent.delete(`/api/api-keys/${created.body._id}`);
    const afterDelete = await agent.get("/api/api-keys");
    expect(afterDelete.body).toHaveLength(0);
  });
});

describe("Notifications", () => {
  it("only lists the caller's own notifications and can mark one read", async () => {
    const { agent, user } = await registerUser("NotifUser");
    const { user: other } = await registerUser("OtherUser");
    const mine = await Notification.create({ user_id: user._id, type: "info", title: "Hello" });
    await Notification.create({ user_id: other._id, type: "info", title: "Not yours" });

    const list = await agent.get("/api/notifications");
    expect(list.body).toHaveLength(1);
    expect(list.body[0].title).toBe("Hello");

    const marked = await agent.post(`/api/notifications/${mine._id}/read`);
    expect(marked.status).toBe(200);
    expect(marked.body.read_at).not.toBeNull();
  });
});

describe("Feature flags", () => {
  it("evaluates target_type 'everyone' and 'user' correctly", async () => {
    await FeatureFlag.create({ key: "beta-dashboard", enabled: true, target_type: "everyone" });
    expect(await isFeatureEnabled("beta-dashboard")).toBe(true);

    await FeatureFlag.create({ key: "beta-x", enabled: false, target_type: "everyone" });
    expect(await isFeatureEnabled("beta-x")).toBe(false);

    const targetUserId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    await FeatureFlag.create({ key: "beta-user-only", enabled: true, target_type: "user", target_user_ids: [targetUserId] });
    expect(await isFeatureEnabled("beta-user-only", { userId: targetUserId })).toBe(true);
    expect(await isFeatureEnabled("beta-user-only", { userId: "bbbbbbbbbbbbbbbbbbbbbbbb" })).toBe(false);
  });

  it("admin can create and toggle a flag via the API", async () => {
    const { agent: adminAgent } = await registerAdmin("Admin4");

    const created = await adminAgent.post("/api/admin/feature-flags").send({ key: "new-flag", enabled: false });
    expect(created.status).toBe(201);

    const toggled = await adminAgent.post(`/api/admin/feature-flags/${created.body._id}/toggle`).send({ enabled: true });
    expect(toggled.status).toBe(200);
    expect(toggled.body.enabled).toBe(true);
  });
});
