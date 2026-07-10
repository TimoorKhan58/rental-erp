import { AuditLog } from "@/modules/audit/domain/audit-log.entity";
import type { AuditLogId } from "@/shared/domain/ids";
import type {
  AuditAction,
  AuditStatus,
  AuditValues,
} from "@/shared/infrastructure/audit/audit-logger.interface";

function toAuditValues(value: unknown): AuditValues | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as AuditValues;
  }

  return null;
}

export function toAuditLogDomain(record: {
  id: string;
  userId: string | null;
  module: string;
  entityName: string;
  recordId: string;
  action: AuditAction;
  status: AuditStatus;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  httpMethod: string | null;
  route: string | null;
  errorMessage: string | null;
  createdAt: Date;
}): AuditLog {
  return AuditLog.reconstitute({
    id: record.id as AuditLogId,
    userId: record.userId,
    module: record.module,
    entityName: record.entityName,
    recordId: record.recordId,
    action: record.action,
    status: record.status,
    oldValues: toAuditValues(record.oldValues),
    newValues: toAuditValues(record.newValues),
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    requestId: record.requestId,
    httpMethod: record.httpMethod,
    route: record.route,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
  });
}
