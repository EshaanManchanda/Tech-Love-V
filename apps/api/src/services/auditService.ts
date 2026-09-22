import { AuditLog } from "../models/AuditLog.js";

export async function audit(params: {
  actorId: string;
  action: string;
  resource: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  await AuditLog.create({
    actor_id: params.actorId,
    action: params.action,
    resource: params.resource,
    resource_id: params.resourceId,
    before: params.before,
    after: params.after,
    ip: params.ip,
  });
}
