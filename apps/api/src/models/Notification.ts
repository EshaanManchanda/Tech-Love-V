import { Schema, model, Types } from "mongoose";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationDoc {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  read_at?: Date;
  created_at: Date;
}

const notificationSchema = new Schema<NotificationDoc>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["info", "success", "warning", "error"], default: "info" },
  title: { type: String, required: true },
  body: String,
  read_at: Date,
  created_at: { type: Date, default: Date.now },
});

export const Notification = model<NotificationDoc>("Notification", notificationSchema);
