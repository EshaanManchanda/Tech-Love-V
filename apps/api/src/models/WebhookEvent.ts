import { Schema, model } from "mongoose";

export interface WebhookEventDoc {
  _id: string;
  // Named for Stripe, but holds every provider's event id (Lemon Squeezy's start with "ls_").
  // Renaming it would leave the unique index on stripe_event_id behind and break inserts.
  stripe_event_id: string;
  provider?: "stripe" | "lemonsqueezy";
  type: string;
  processed_at: Date;
}

const webhookEventSchema = new Schema<WebhookEventDoc>({
  stripe_event_id: { type: String, required: true, unique: true },
  provider: String,
  type: { type: String, required: true },
  processed_at: { type: Date, default: Date.now },
});

export const WebhookEvent = model<WebhookEventDoc>("WebhookEvent", webhookEventSchema);
