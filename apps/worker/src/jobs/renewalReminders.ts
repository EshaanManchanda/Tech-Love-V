import { License } from "../models/License.js";
import { User } from "../models/User.js";
import { emailQueue } from "../queues.js";

// SaaS-customer subscription reminders — distinct from the WordPress plugin's
// own wp_cg_renewal_reminders_sent (which reminds a *certificate holder* that
// their certificate is expiring; unrelated system, no overlap).
const REMINDER_DAYS = [30, 14, 7, 3, 1];

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
    if (!REMINDER_DAYS.includes(remaining)) continue;
    if (license.reminders_sent?.includes(remaining)) continue;

    const user = await User.findById(license.user_id);
    if (!user) continue;

    await emailQueue.add("license-expiring", {
      type: "license-expiring",
      to: user.email,
      data: { name: user.name, plan: license.plan, daysUntil: remaining, expiresAt: license.expires_at },
    });

    await License.updateOne({ _id: license._id }, { $addToSet: { reminders_sent: remaining } });
    sent++;
  }

  return sent;
}
