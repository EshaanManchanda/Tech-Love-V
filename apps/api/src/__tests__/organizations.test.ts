import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Organization } from "../models/Organization.js";

const app = createApp();

async function registerUser(name: string) {
  const agent = request.agent(app);
  const email = `${name}${Date.now()}${Math.random()}@example.com`.toLowerCase();
  const res = await agent.post("/api/auth/register").send({ name, email, password: "password123" });
  return { agent, user: res.body as { _id: string; email: string } };
}

describe("registration", () => {
  it("creates a personal organization with the new user as owner", async () => {
    const { user } = await registerUser("Owner");

    const org = await Organization.findOne({ owner_id: user._id });
    expect(org).not.toBeNull();
    expect(org!.members).toHaveLength(1);
    expect(org!.members[0].role).toBe("owner");
    expect(org!.members[0].user_id.toString()).toBe(user._id.toString());
  });
});

describe("GET /api/organizations", () => {
  it("lists the caller's organizations with their role", async () => {
    const { agent } = await registerUser("Lister");

    const res = await agent.get("/api/organizations");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ role: "owner", member_count: 1 });
  });
});

describe("POST /api/organizations/:id/members", () => {
  it("lets the owner add an existing user as a member", async () => {
    const { agent: ownerAgent, user: owner } = await registerUser("Boss");
    const { user: invitee } = await registerUser("Invitee");
    const orgId = (await Organization.findOne({ owner_id: owner._id }))!._id.toString();

    const res = await ownerAgent.post(`/api/organizations/${orgId}/members`).send({ email: invitee.email, role: "developer" });

    expect(res.status).toBe(201);
    expect(res.body.members).toHaveLength(2);
  });

  it("rejects a non-manager member trying to invite others", async () => {
    const { agent: ownerAgent, user: owner } = await registerUser("Boss2");
    const { agent: devAgent, user: dev } = await registerUser("Dev");
    const { user: thirdParty } = await registerUser("Third");
    const orgId = (await Organization.findOne({ owner_id: owner._id }))!._id.toString();

    await ownerAgent.post(`/api/organizations/${orgId}/members`).send({ email: dev.email, role: "developer" });
    const res = await devAgent.post(`/api/organizations/${orgId}/members`).send({ email: thirdParty.email, role: "developer" });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/organizations/:id/members/:userId", () => {
  it("refuses to remove the owner", async () => {
    const { agent: ownerAgent, user: owner } = await registerUser("Boss3");
    const orgId = (await Organization.findOne({ owner_id: owner._id }))!._id.toString();

    const res = await ownerAgent.delete(`/api/organizations/${orgId}/members/${owner._id}`);
    expect(res.status).toBe(400);
  });

  it("removes a regular member", async () => {
    const { agent: ownerAgent, user: owner } = await registerUser("Boss4");
    const { user: member } = await registerUser("Member");
    const orgId = (await Organization.findOne({ owner_id: owner._id }))!._id.toString();
    await ownerAgent.post(`/api/organizations/${orgId}/members`).send({ email: member.email, role: "developer" });

    const res = await ownerAgent.delete(`/api/organizations/${orgId}/members/${member._id}`);
    expect(res.status).toBe(204);

    const org = await Organization.findById(orgId);
    expect(org!.members).toHaveLength(1);
  });
});
