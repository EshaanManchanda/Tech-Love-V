import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res) => {
  const notifications = await Notification.find({ user_id: req.user!.id }).sort({ created_at: -1 }).limit(50).lean();
  res.json(notifications);
});

notificationsRouter.post("/:id/read", async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user!.id },
    { read_at: new Date() },
    { new: true },
  );
  if (!notification) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found." } });
  res.json(notification);
});
