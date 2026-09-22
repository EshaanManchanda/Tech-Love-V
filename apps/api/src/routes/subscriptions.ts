import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Subscription } from "../models/Subscription.js";

export const subscriptionsRouter = Router();
subscriptionsRouter.use(requireAuth);

subscriptionsRouter.get("/me", async (req, res) => {
  const subscriptions = await Subscription.find({ user_id: req.user!.id }).sort({ created_at: -1 }).lean();
  res.json(subscriptions);
});
