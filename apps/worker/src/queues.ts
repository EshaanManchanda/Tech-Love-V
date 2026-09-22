import { Queue } from "bullmq";
import { connection } from "./redis.js";

// Queue name strings are the contract with apps/api's producer side
// (apps/api/src/queues/emailQueue.ts) — no shared package, just an agreed name.
export const emailQueue = new Queue("email", { connection });
export const renewalReminderQueue = new Queue("renewal-reminders", { connection });
