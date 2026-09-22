import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { ApiKey } from "../models/ApiKey.js";

export const apiKeysRouter = Router();
apiKeysRouter.use(requireAuth);

function generateRawKey(): string {
  return `cgsk_${randomBytes(24).toString("hex")}`;
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

apiKeysRouter.get("/", async (req, res) => {
  const keys = await ApiKey.find({ user_id: req.user!.id, revoked_at: { $exists: false } }).select("-key_hash").lean();
  res.json(keys);
});

apiKeysRouter.post("/", async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "name is required" } });

  const raw = generateRawKey();
  const key = await ApiKey.create({
    user_id: req.user!.id,
    name: parsed.data.name,
    key_prefix: raw.slice(0, 12),
    key_hash: hashKey(raw),
  });

  // The only time the raw key is ever visible — not retrievable again after this response.
  res.status(201).json({ _id: key._id, name: key.name, key_prefix: key.key_prefix, key: raw, created_at: key.created_at });
});

apiKeysRouter.delete("/:id", async (req, res) => {
  const key = await ApiKey.findOneAndUpdate({ _id: req.params.id, user_id: req.user!.id }, { revoked_at: new Date() }, { new: true });
  if (!key) return res.status(404).json({ error: { code: "NOT_FOUND", message: "API key not found." } });
  res.status(204).end();
});
