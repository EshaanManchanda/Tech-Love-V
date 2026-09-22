import { Schema, model, Types } from "mongoose";

export interface SupportMessageDoc {
  _id: Types.ObjectId;
  ticket_id: Types.ObjectId;
  sender_id: Types.ObjectId;
  sender_role: "customer" | "admin";
  body: string;
  created_at: Date;
}

const supportMessageSchema = new Schema<SupportMessageDoc>({
  ticket_id: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true },
  sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sender_role: { type: String, enum: ["customer", "admin"], required: true },
  body: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const SupportMessage = model<SupportMessageDoc>("SupportMessage", supportMessageSchema);
