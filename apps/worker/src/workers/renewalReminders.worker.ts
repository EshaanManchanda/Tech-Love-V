import { Worker } from "bullmq";
import { connection } from "../redis.js";
import { runRenewalReminders } from "../jobs/renewalReminders.js";

export const renewalReminderWorker = new Worker(
  "renewal-reminders",
  async () => {
    const sent = await runRenewalReminders();
    console.log(`[renewal-reminders] queued ${sent} reminder email(s)`);
  },
  { connection },
);

renewalReminderWorker.on("failed", (job, err) => {
  console.error(`[renewal-reminders worker] job ${job?.id} failed:`, err.message);
});
