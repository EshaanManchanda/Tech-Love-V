import { Schema, model, Types } from "mongoose";

export type TicketCategory = "billing" | "license" | "plugin" | "bug" | "feature_request" | "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";

export interface SupportTicketDoc {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  organization_id?: Types.ObjectId;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const supportTicketSchema = new Schema<SupportTicketDoc>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization_id: { type: Schema.Types.ObjectId, ref: "Organization" },
  subject: { type: String, required: true },
  category: { type: String, enum: ["billing", "license", "plugin", "bug", "feature_request", "other"], default: "other" },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  status: { type: String, enum: ["open", "in_progress", "waiting_customer", "resolved", "closed"], default: "open" },
  assigned_to: { type: Schema.Types.ObjectId, ref: "User" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const SupportTicket = model<SupportTicketDoc>("SupportTicket", supportTicketSchema);
