import type { AuditLogId } from "@/shared/domain/ids";
import type {
  AuditAction,
  AuditStatus,
  AuditValues,
} from "@/shared/infrastructure/audit/audit-logger.interface";

export interface AuditLogProps {
  id: AuditLogId;
  userId: string | null;
  module: string;
  entityName: string;
  recordId: string;
  action: AuditAction;
  status: AuditStatus;
  oldValues: AuditValues | null;
  newValues: AuditValues | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  httpMethod: string | null;
  route: string | null;
  errorMessage: string | null;
  createdAt: Date;
}
