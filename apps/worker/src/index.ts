import "dotenv/config";
import mongoose from "mongoose";
import { emailWorker } from "./workers/email.worker.js";
import { renewalReminderWorker } from "./workers/renewalReminders.worker.js";
import { renewalReminderQueue } from "./queues.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://localhost:27017/certificate-license-platform");

  // Daily at 06:00 UTC — idempotent to re-add on every worker restart (BullMQ dedupes by job id/pattern).
  await renewalReminderQueue.add("daily", {}, { repeat: { pattern: "0 6 * * *" }, jobId: "renewal-reminders-daily" });

  console.log("Worker started — consuming: email, renewal-reminders");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await Promise.all([emailWorker.close(), renewalReminderWorker.close()]);
  await mongoose.disconnect();
  process.exit(0);
});
