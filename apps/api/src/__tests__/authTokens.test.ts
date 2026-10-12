import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { signAccessToken, signSetPasswordToken } from "../services/authService.js";

const app = createApp();

describe("access_token cookie", () => {
  it("accepts a login token but not a set-password token signed with the same secret", async () => {
    const user = await User.create({ name: "T", email: `t${Date.now()}@example.com`, password_hash: "x", role: "customer" });
    const asCookie = (token: string) => request(app).get("/api/licenses/me").set("Cookie", `access_token=${token}`);

    expect((await asCookie(signAccessToken({ sub: user._id.toString(), role: "customer" }))).status).toBe(200);
    expect((await asCookie(signSetPasswordToken(user._id.toString()))).status).toBe(401);
  });
});
