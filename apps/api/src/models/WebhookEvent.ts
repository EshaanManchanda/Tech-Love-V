import { Schema, model } from "mongoose";

export interface WebhookEventDoc {
  _id: string;
  stripe_event_id: string;
  type: string;
  processed_at: Date;
}

const webhookEventSchema = new Schema<WebhookEventDoc>({
  stripe_event_id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  processed_at: { type: Date, default: Date.now },
});

export const WebhookEvent = model<WebhookEventDoc>("WebhookEvent", webhookEventSchema);
