import type {
  AuditAction,
  AuditStatus,
  AuditValues,
} from "@/shared/infrastructure/audit/audit-logger.interface";

export interface AuditLogDto {
  id: string;
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
  createdAt: string;
}

export interface AuditLogIdParamDto {
  id: string;
}
