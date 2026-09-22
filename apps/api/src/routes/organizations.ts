import { Router } from "express";
import type { Types } from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { Organization, type OrgRole } from "../models/Organization.js";
import { User } from "../models/User.js";

export const organizationsRouter = Router();
organizationsRouter.use(requireAuth);

const MANAGE_ROLES: OrgRole[] = ["owner", "admin"];

async function requireManager(orgId: string, userId: string) {
  const org = await Organization.findById(orgId);
  if (!org) return { org: null, member: null };
  const member = org.members.find((m) => m.user_id.toString() === userId);
  return { org, member };
}

organizationsRouter.get("/", async (req, res) => {
  const orgs = await Organization.find({ "members.user_id": req.user!.id }).lean();
  res.json(
    orgs.map((org) => ({
      _id: org._id,
      name: org.name,
      owner_id: org.owner_id,
      role: org.members.find((m) => m.user_id.toString() === req.user!.id)?.role,
      member_count: org.members.length,
    })),
  );
});

organizationsRouter.post("/", async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "name is required" } });

  const org = await Organization.create({
    name: parsed.data.name,
    owner_id: req.user!.id,
    members: [{ user_id: req.user!.id, role: "owner" }],
  });
  res.status(201).json(org);
});

organizationsRouter.post("/:id/members", async (req, res) => {
  const parsed = z
    .object({ email: z.string().email(), role: z.enum(["admin", "billing_manager", "developer", "support"]) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "email and role are required" } });

  const { org, member } = await requireManager(req.params.id, req.user!.id);
  if (!org) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Organization not found." } });
  if (!member || !MANAGE_ROLES.includes(member.role)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only owners/admins can manage members." } });
  }

  const invitee = await User.findOne({ email: parsed.data.email });
  if (!invitee) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "No account with that email yet." } });

  if (org.members.some((m) => m.user_id.toString() === invitee._id.toString())) {
    return res.status(409).json({ error: { code: "ALREADY_MEMBER", message: "That user is already a member." } });
  }

  org.members.push({ user_id: invitee._id as unknown as Types.ObjectId, role: parsed.data.role });
  await org.save();
  res.status(201).json(org);
});

organizationsRouter.delete("/:id/members/:userId", async (req, res) => {
  const { org, member } = await requireManager(req.params.id, req.user!.id);
  if (!org) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Organization not found." } });
  if (!member || !MANAGE_ROLES.includes(member.role)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only owners/admins can manage members." } });
  }
  if (org.owner_id.toString() === req.params.userId) {
    return res.status(400).json({ error: { code: "CANNOT_REMOVE_OWNER", message: "The owner cannot be removed." } });
  }

  org.members = org.members.filter((m) => m.user_id.toString() !== req.params.userId);
  await org.save();
  res.status(204).end();
});
