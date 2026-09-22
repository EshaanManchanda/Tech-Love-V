import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { User } from "../models/User.js";

const app = createApp();

async function registerUser(name: string) {
  const agent = request.agent(app);
  const email = `${name}${Date.now()}${Math.random()}@example.com`.toLowerCase();
  const res = await agent.post("/api/auth/register").send({ name, email, password: "password123" });
  return { agent, user: res.body as { _id: string; email: string }, email };
}

async function registerAdmin(name: string) {
  const { agent, user, email } = await registerUser(name);
  await User.updateOne({ _id: user._id }, { role: "admin" });
  await agent.post("/api/auth/login").send({ email, password: "password123" });
  return { agent, user };
}

describe("support tickets", () => {
  it("lets a customer create a ticket and only see their own", async () => {
    const { agent: mine } = await registerUser("Ticketer1");
    const { agent: theirs } = await registerUser("Ticketer2");

    const created = await mine.post("/api/support/tickets").send({ subject: "Can't activate", category: "license", body: "Getting an error." });
    expect(created.status).toBe(201);

    const myList = await mine.get("/api/support/tickets");
    expect(myList.body).toHaveLength(1);

    const theirList = await theirs.get("/api/support/tickets");
    expect(theirList.body).toHaveLength(0);
  });

  it("404s when a customer tries to read someone else's ticket", async () => {
    const { agent: owner } = await registerUser("Owner1");
    const { agent: stranger } = await registerUser("Stranger1");
    const created = await owner.post("/api/support/tickets").send({ subject: "Billing question", category: "billing", body: "Hi" });

    const res = await stranger.get(`/api/support/tickets/${created.body._id}`);
    expect(res.status).toBe(404);
  });

  it("an admin reply moves the ticket to waiting_customer and the admin can see every ticket", async () => {
    const { agent: customerAgent } = await registerUser("Customer3");
    const { agent: adminAgent } = await registerAdmin("SupportAdmin");

    const created = await customerAgent.post("/api/support/tickets").send({ subject: "Plugin bug", category: "bug", body: "It crashes." });

    const allTickets = await adminAgent.get("/api/support/tickets");
    expect(allTickets.body.some((t: { _id: string }) => t._id === created.body._id)).toBe(true);

    const reply = await adminAgent.post(`/api/support/tickets/${created.body._id}/messages`).send({ body: "Looking into it." });
    expect(reply.status).toBe(201);

    const detail = await customerAgent.get(`/api/support/tickets/${created.body._id}`);
    expect(detail.body.ticket.status).toBe("waiting_customer");
    expect(detail.body.messages).toHaveLength(2);
  });

  it("only an admin can change ticket status", async () => {
    const { agent: customerAgent } = await registerUser("Customer4");
    const created = await customerAgent.post("/api/support/tickets").send({ subject: "Question", category: "other", body: "Hi" });

    const res = await customerAgent.post(`/api/support/tickets/${created.body._id}/status`).send({ status: "resolved" });
    expect(res.status).toBe(403);
  });
});
