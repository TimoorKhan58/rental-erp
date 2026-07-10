import type { AuditLogDto } from "@/modules/audit/application/dtos/audit-log.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface AuditLogResponse {
  id: string;
  userId: string | null;
  module: string;
  entityName: string;
  recordId: string;
  action: string;
  status: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  httpMethod: string | null;
  route: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  items: AuditLogResponse[];
  meta: PaginationMeta;
}

export function toAuditLogResponse(dto: AuditLogDto): AuditLogResponse {
  return {
    id: dto.id,
    userId: dto.userId,
    module: dto.module,
    entityName: dto.entityName,
    recordId: dto.recordId,
    action: dto.action,
    status: dto.status,
    oldValues: dto.oldValues,
    newValues: dto.newValues,
    ipAddress: dto.ipAddress,
    userAgent: dto.userAgent,
    requestId: dto.requestId,
    httpMethod: dto.httpMethod,
    route: dto.route,
    errorMessage: dto.errorMessage,
    createdAt: dto.createdAt,
  };
}

export function toAuditLogListResponse(
  result: PaginatedResult<AuditLogDto>,
): AuditLogListResponse {
  return {
    items: result.items.map(toAuditLogResponse),
    meta: result.meta,
  };
}
