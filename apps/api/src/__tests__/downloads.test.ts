import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { License } from "../models/License.js";
import { Product } from "../models/Product.js";

const app = createApp();
const slug = "certificate-generator";

beforeEach(async () => {
  await Product.create({
    name: "Certificate Generator",
    slug,
    versions: [
      // No edition stored: a version uploaded before Free/Pro split must count as free.
      { version: "7.8.0", zip_filename: "free.zip", zip_path: "/nonexistent/free.zip", file_size: 1, is_current: true },
      { version: "1.1.0", edition: "pro", zip_filename: "pro.zip", zip_path: "/nonexistent/pro.zip", file_size: 1, is_current: true },
    ],
  });
});

async function registerAgent() {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").send({ name: "U", email: `u${Date.now()}${Math.random()}@example.com`, password: "password123" });
  return { agent, userId: res.body._id as string };
}

describe("GET /api/downloads/plugin", () => {
  it("serves Free info without login, defaulting to the free edition", async () => {
    const res = await request(app).get(`/api/downloads/plugin/info?product=${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe("7.8.0");
  });

  it("requires login for Pro", async () => {
    const res = await request(app).get(`/api/downloads/plugin/info?product=${slug}&edition=pro`);
    expect(res.status).toBe(401);
  });

  it("requires an active, unexpired Pro license for Pro", async () => {
    const { agent, userId } = await registerAgent();
    const url = `/api/downloads/plugin/info?product=${slug}&edition=pro`;

    expect((await agent.get(url)).status).toBe(403);

    const lic = await License.create({ license_key: `PRO-T-${Date.now()}`, user_id: userId, plan: "pro", activation_limit: 1, expires_at: "2000-01-01" });
    expect((await agent.get(url)).status).toBe(403);

    await License.updateOne({ _id: lic._id }, { expires_at: "2099-01-01" });
    const ok = await agent.get(url);
    expect(ok.status).toBe(200);
    expect(ok.body.version).toBe("1.1.0");
  });
});
