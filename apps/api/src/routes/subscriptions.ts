import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { enqueueEmail } from "../queues/emailQueue.js";
import { refundAndCancel, refundEligibleUntil, toIsoDate } from "../services/billingService.js";
import { getPaymentProvider } from "../services/payments/index.js";

export const subscriptionsRouter = Router();
subscriptionsRouter.use(requireAuth);

subscriptionsRouter.get("/me", async (req, res) => {
  const subscriptions = await Subscription.find({ user_id: req.user!.id }).sort({ created_at: -1 });
  res.json(
    await Promise.all(
      subscriptions.map(async (sub) => ({ ...sub.toObject(), refund_eligible_until: await refundEligibleUntil(sub) })),
    ),
  );
});

async function ownSubscription(userId: string, id: string) {
  return Subscription.findOne({ _id: id, user_id: userId }).catch(() => null); // a malformed id is just "not found"
}

/**
 * Within the 7-day window: full refund and the license is cancelled now. After it: no refund,
 * the subscription just won't renew and the license works until the paid period ends.
 */
subscriptionsRouter.post("/:id/cancel", async (req, res) => {
  const subscription = await ownSubscription(req.user!.id, req.params.id);
  if (!subscription) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Subscription not found." } });
  if (subscription.status === "cancelled" || subscription.cancel_at_period_end) {
    return res.status(400).json({ error: { code: "ALREADY_CANCELLED", message: "This subscription is already cancelled." } });
  }

  const refund = !!(await refundEligibleUntil(subscription));
  try {
    if (refund) {
      await refundAndCancel(subscription);
    } else {
      await getPaymentProvider(subscription.provider).cancelSubscription(subscription.provider_subscription_id, true);
      // The subscription_cancelled webhook confirms this; set it now so the page doesn't wait on it
      // (which also means the webhook sees nothing new and doesn't email again).
      await Subscription.updateOne({ _id: subscription._id }, { cancel_at_period_end: true, cancelled_at: new Date(), updated_at: new Date() });
      const user = await User.findById(subscription.user_id);
      if (user) {
        enqueueEmail("subscription-cancelled", user.email, {
          name: user.name,
          plan: subscription.plan,
          accessUntil: toIsoDate(subscription.current_period_end),
        });
      }
    }
  } catch (err) {
    req.log.error({ err, subscription: subscription._id, refund }, "subscription cancel: provider refused");
    return res.status(502).json({ error: { code: "CANCEL_FAILED", message: "Couldn't cancel right now. Please try again later or contact us." } });
  }
  res.json({ refunded: refund });
});

subscriptionsRouter.post("/:id/resume", async (req, res) => {
  const subscription = await ownSubscription(req.user!.id, req.params.id);
  if (!subscription) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Subscription not found." } });
  if (!subscription.cancel_at_period_end || subscription.status === "cancelled" || subscription.current_period_end < new Date()) {
    return res.status(400).json({ error: { code: "NOT_RESUMABLE", message: "Only a cancelled subscription that hasn't ended yet can be resumed." } });
  }
  try {
    await getPaymentProvider(subscription.provider).resumeSubscription(subscription.provider_subscription_id);
  } catch (err) {
    req.log.error({ err, subscription: subscription._id }, "subscription resume: provider refused");
    return res.status(502).json({ error: { code: "RESUME_FAILED", message: "Couldn't resume right now. Please try again later or contact us." } });
  }
  await Subscription.updateOne({ _id: subscription._id }, { cancel_at_period_end: false, $unset: { cancelled_at: 1 }, updated_at: new Date() });
  res.json({ resumed: true });
});
