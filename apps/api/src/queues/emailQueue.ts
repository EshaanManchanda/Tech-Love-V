import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { logger } from "../logger.js";

// Producer side only — apps/worker owns the actual Worker + template rendering.
// Queue name "email" is the contract between the two; see apps/worker/src/queues.ts.
// Fails fast instead of buffering/retrying forever when Redis is unreachable —
// this is a fire-and-forget producer, not a worker; a missing Redis must
// never make requests hang.
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
  lazyConnect: true,
  enableOfflineQueue: false,
});
connection.on("error", () => {}); // swallow — enqueueEmail()'s .catch() already logs the outcome

export const emailQueue = new Queue("email", { connection });

export type EmailTemplateType = "welcome" | "invite" | "license-created" | "license-expiring" | "support-reply";

/**
 * Fire-and-forget: never let a Redis/worker outage block or fail the caller
 * (registration, checkout webhook). Matches the existing fire-and-forget
 * pattern in licenseService's usage reporting.
 */
export function enqueueEmail(type: EmailTemplateType, to: string, data: Record<string, unknown>): void {
  emailQueue.add(type, { type, to, data }).catch((err) => {
    if (process.env.NODE_ENV === "test") return; // expected noise — no Redis in the test env
    logger.error({ err, type, to }, "failed to enqueue email");
  });
}
