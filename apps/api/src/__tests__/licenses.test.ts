import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { License } from "../models/License.js";
import { User } from "../models/User.js";

const app = createApp();

async function registerUser(name: string) {
  const agent = request.agent(app);
  const email = `${name}${Date.now()}${Math.random()}@example.com`.toLowerCase();
  const res = await agent.post("/api/auth/register").send({ name, email, password: "password123" });
  return { agent, user: res.body as { _id: string; email: string } };
}

async function makeLicenseFor(userId: string, overrides: Partial<{ status: "active" | "suspended" | "cancelled" }> = {}) {
  return License.create({
    license_key: `CG-TEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    user_id: userId,
    plan: "pro",
    status: overrides.status ?? "active",
    activation_limit: 1,
    expires_at: "2099-01-01",
  });
}

describe("POST /api/licenses/:id/regenerate-key", () => {
  it("changes the license key for the owning user", async () => {
    const { agent, user } = await registerUser("Owner");
    const license = await makeLicenseFor(user._id);
    const originalKey = license.license_key;

    const res = await agent.post(`/api/licenses/${license._id}/regenerate-key`);

    expect(res.status).toBe(200);
    expect(res.body.license_key).not.toBe(originalKey);
    expect(res.body.license_key).toMatch(/^PRO-/);
  });

  it("404s for a license owned by someone else", async () => {
    const { user: owner } = await registerUser("RealOwner");
    const { agent: otherAgent } = await registerUser("Stranger");
    const license = await makeLicenseFor(owner._id);

    const res = await otherAgent.post(`/api/licenses/${license._id}/regenerate-key`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/licenses/:id/transfer", () => {
  it("moves ownership to an existing account with no linked subscription", async () => {
    const { agent, user: owner } = await registerUser("FromUser");
    const { user: newOwner } = await registerUser("ToUser");
    const license = await makeLicenseFor(owner._id);

    const res = await agent.post(`/api/licenses/${license._id}/transfer`).send({ email: newOwner.email });

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(newOwner._id);
  });

  it("refuses to transfer a suspended license", async () => {
    const { agent, user: owner } = await registerUser("SuspendedOwner");
    const { user: newOwner } = await registerUser("WouldBeOwner");
    const license = await makeLicenseFor(owner._id, { status: "suspended" });

    const res = await agent.post(`/api/licenses/${license._id}/transfer`).send({ email: newOwner.email });

    expect(res.status).toBe(400);
  });

  it("404s (via not-found-for-this-user) when the license isn't the caller's", async () => {
    const { user: owner } = await registerUser("Owner2");
    const { agent: otherAgent, user: other } = await registerUser("NotOwner");
    const license = await makeLicenseFor(owner._id);

    const res = await otherAgent.post(`/api/licenses/${license._id}/transfer`).send({ email: other.email });
    expect(res.status).toBe(400);
  });
});
