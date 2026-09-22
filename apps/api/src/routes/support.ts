import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { SupportMessage } from "../models/SupportMessage.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { User } from "../models/User.js";
import { enqueueEmail } from "../queues/emailQueue.js";

export const supportRouter = Router();
supportRouter.use(requireAuth);

function isAdmin(req: Request): boolean {
  return req.user!.role === "admin";
}

supportRouter.get("/tickets", async (req, res) => {
  const filter = isAdmin(req) ? {} : { user_id: req.user!.id };
  const tickets = await SupportTicket.find(filter).sort({ updated_at: -1 }).populate("user_id", "name email").lean();
  res.json(tickets);
});

const createSchema = z.object({
  subject: z.string().min(1),
  category: z.enum(["billing", "license", "plugin", "bug", "feature_request", "other"]),
  body: z.string().min(1),
});

supportRouter.post("/tickets", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });

  const ticket = await SupportTicket.create({
    user_id: req.user!.id,
    subject: parsed.data.subject,
    category: parsed.data.category,
  });
  await SupportMessage.create({ ticket_id: ticket._id, sender_id: req.user!.id, sender_role: "customer", body: parsed.data.body });
  res.status(201).json(ticket);
});

async function loadTicketForRequester(req: Request, ticketId: string) {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) return null;
  if (!isAdmin(req) && ticket.user_id.toString() !== req.user!.id) return null;
  return ticket;
}

supportRouter.get("/tickets/:id", async (req, res) => {
  const ticket = await loadTicketForRequester(req, req.params.id);
  if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });

  const messages = await SupportMessage.find({ ticket_id: ticket._id }).sort({ created_at: 1 }).lean();
  res.json({ ticket, messages });
});

supportRouter.post("/tickets/:id/messages", async (req, res) => {
  const parsed = z.object({ body: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "body is required" } });

  const ticket = await loadTicketForRequester(req, req.params.id);
  if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });

  const senderRole = isAdmin(req) ? "admin" : "customer";
  const message = await SupportMessage.create({ ticket_id: ticket._id, sender_id: req.user!.id, sender_role: senderRole, body: parsed.data.body });

  ticket.status = senderRole === "admin" ? "waiting_customer" : "open";
  ticket.updated_at = new Date();
  await ticket.save();

  if (senderRole === "admin") {
    const customer = await User.findById(ticket.user_id);
    if (customer) {
      enqueueEmail("support-reply", customer.email, { name: customer.name, subject: ticket.subject, body: parsed.data.body });
    }
  }

  res.status(201).json(message);
});

supportRouter.post("/tickets/:id/status", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required." } });
  const parsed = z.object({ status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "status is required" } });

  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status: parsed.data.status, updated_at: new Date() }, { new: true });
  if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
  res.json(ticket);
});

supportRouter.post("/tickets/:id/assign", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required." } });
  const parsed = z.object({ admin_id: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "admin_id is required" } });

  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { assigned_to: parsed.data.admin_id, updated_at: new Date() }, { new: true });
  if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
  res.json(ticket);
});
