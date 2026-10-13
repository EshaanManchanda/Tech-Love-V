import { License } from "../models/License.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { emailQueue } from "../queues.js";

// SaaS-customer subscription reminders — distinct from the WordPress plugin's
// own wp_cg_renewal_reminders_sent (which reminds a *certificate holder* that
// their certificate is expiring; unrelated system, no overlap).
const REMINDER_DAYS = [30, 14, 7, 3, 1];
// One day past expires_at: the license has stopped working. Stored in reminders_sent like the others so it's sent once.
const EXPIRED_DAY = -1;
// A subscription that will renew isn't "expiring" — its expires_at moves forward on every payment.
const RENEWING = ["active", "trialing", "past_due"];

function daysUntil(expiresAt: string): number {
  const expires = new Date(`${expiresAt}T00:00:00Z`).getTime();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.round((expires - today.getTime()) / (24 * 60 * 60 * 1000));
}

export async function runRenewalReminders(): Promise<number> {
  const licenses = await License.find({ status: "active" });
  let sent = 0;

  for (const license of licenses) {
    const remaining = daysUntil(license.expires_at);
    if (!REMINDER_DAYS.includes(remaining) && remaining !== EXPIRED_DAY) continue;
    if (license.reminders_sent?.includes(remaining)) continue;

    if (license.subscription_id) {
      const subscription = await Subscription.findById(license.subscription_id);
      if (subscription && RENEWING.includes(subscription.status) && !subscription.cancel_at_period_end) continue;
    }

    const user = await User.findById(license.user_id);
    if (!user) continue;

    const type = remaining === EXPIRED_DAY ? "license-expired" : "license-expiring";
    await emailQueue.add(type, {
      type,
      to: user.email,
      data: { name: user.name, plan: license.plan, daysUntil: remaining, expiresAt: license.expires_at },
    });

    await License.updateOne({ _id: license._id }, { $addToSet: { reminders_sent: remaining } });
    sent++;
  }

  return sent;
}
