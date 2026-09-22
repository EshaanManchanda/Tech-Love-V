import { Schema, model, Types } from "mongoose";

export interface AuditLogDoc {
  _id: Types.ObjectId;
  actor_id: Types.ObjectId;
  action: string; // e.g. "license.extend", "license.disable", "user.impersonate"
  resource: string; // e.g. "License", "User"
  resource_id: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  created_at: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>({
  actor_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resource_id: { type: String, required: true },
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  ip: String,
  created_at: { type: Date, default: Date.now },
});

export const AuditLog = model<AuditLogDoc>("AuditLog", auditLogSchema);
