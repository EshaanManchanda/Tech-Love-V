import { Redis } from "ioredis";

// maxRetriesPerRequest: null is required by BullMQ's blocking connections.
export const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
