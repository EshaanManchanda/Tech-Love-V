import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { User } from "../models/User.js";

const app = createApp();

let adminAgent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  adminAgent = request.agent(app);
  const email = `admin${Date.now()}@example.com`;
  const res = await adminAgent.post("/api/auth/register").send({ name: "Admin", email, password: "password123" });
  await User.updateOne({ _id: res.body._id }, { role: "admin" });
  await adminAgent.post("/api/auth/login").send({ email, password: "password123" });
});

describe("POST /api/admin/customers", () => {
  it("creates a customer with a direct password that can immediately log in", async () => {
    const email = `direct${Date.now()}@example.com`;
    const res = await adminAgent.post("/api/admin/customers").send({ name: "Direct", email, mode: "set_password", password: "temp12345" });
    expect(res.status).toBe(201);

    const login = await request(app).post("/api/auth/login").send({ email, password: "temp12345" });
    expect(login.status).toBe(200);
  });

  it("creates a customer with mode=email_link whose password is random, not guessable", async () => {
    const email = `link${Date.now()}@example.com`;
    const res = await adminAgent.post("/api/admin/customers").send({ name: "Link", email, mode: "email_link" });
    expect(res.status).toBe(201);

    const login = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    expect(login.status).toBe(401);
  });

  it("rejects a duplicate email", async () => {
    const email = `dupe${Date.now()}@example.com`;
    await adminAgent.post("/api/admin/customers").send({ name: "First", email, mode: "set_password", password: "temp12345" });
    const res = await adminAgent.post("/api/admin/customers").send({ name: "Second", email, mode: "set_password", password: "temp12345" });
    expect(res.status).toBe(409);
  });
});

describe("customer deactivate/reactivate", () => {
  // Only one real /api/auth/login call here — it and /api/auth/forgot-password
  // share a 5/min limiter (app.ts), and this file's other describe blocks
  // already spend most of that budget on the same `app` instance.
  it("blocks login while disabled, and the reactivate response reports active again", async () => {
    const email = `toggle${Date.now()}@example.com`;
    const create = await adminAgent.post("/api/admin/customers").send({ name: "Toggle", email, mode: "set_password", password: "temp12345" });
    const id = create.body._id;

    const deactivate = await adminAgent.post(`/api/admin/customers/${id}/deactivate`);
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.status).toBe("disabled");

    const blockedLogin = await request(app).post("/api/auth/login").send({ email, password: "temp12345" });
    expect(blockedLogin.status).toBe(403);

    const reactivate = await adminAgent.post(`/api/admin/customers/${id}/reactivate`);
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.status).toBe("active");
  });
});

describe("PATCH /api/admin/customers/:id", () => {
  it("updates name and email", async () => {
    const email = `edit${Date.now()}@example.com`;
    const create = await adminAgent.post("/api/admin/customers").send({ name: "Before", email, mode: "set_password", password: "temp12345" });

    const newEmail = `edited${Date.now()}@example.com`;
    const res = await adminAgent.patch(`/api/admin/customers/${create.body._id}`).send({ name: "After", email: newEmail });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("After");
    expect(res.body.email).toBe(newEmail);
  });
});

// Its own app instance (own rate-limit bucket) — the shared `app` above is
// already close to the 5/min login+forgot-password limiter budget for this file.
describe("POST /api/auth/forgot-password", () => {
  const forgotApp = createApp();
  let forgotAdminAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    forgotAdminAgent = request.agent(forgotApp);
    const email = `admin${Date.now()}@example.com`;
    const res = await forgotAdminAgent.post("/api/auth/register").send({ name: "Admin", email, password: "password123" });
    await User.updateOne({ _id: res.body._id }, { role: "admin" });
    await forgotAdminAgent.post("/api/auth/login").send({ email, password: "password123" });
  });

  it("returns 200 for both an existing and a non-existent email, to avoid enumeration", async () => {
    const email = `exists${Date.now()}@example.com`;
    await forgotAdminAgent.post("/api/admin/customers").send({ name: "Exists", email, mode: "set_password", password: "temp12345" });

    const forExisting = await request(forgotApp).post("/api/auth/forgot-password").send({ email });
    expect(forExisting.status).toBe(200);

    const forMissing = await request(forgotApp).post("/api/auth/forgot-password").send({ email: "nobody-here@example.com" });
    expect(forMissing.status).toBe(200);
  });
});
