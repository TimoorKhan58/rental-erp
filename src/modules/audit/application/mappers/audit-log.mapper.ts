import type { AuditLog } from "@/modules/audit/domain/audit-log.entity";
import type { AuditListQuery } from "@/modules/audit/domain/audit-list.query";
import type { AuditLogId } from "@/shared/domain/ids";

import type { AuditLogDto } from "../dtos/audit-log.dto";
import type { ListAuditInput } from "../schemas/audit.schemas";

export function toAuditLogDto(auditLog: AuditLog): AuditLogDto {
  const props = auditLog.toProps();

  return {
    id: props.id,
    userId: props.userId,
    module: props.module,
    entityName: props.entityName,
    recordId: props.recordId,
    action: props.action,
    status: props.status,
    oldValues: props.oldValues,
    newValues: props.newValues,
    ipAddress: props.ipAddress,
    userAgent: props.userAgent,
    requestId: props.requestId,
    httpMethod: props.httpMethod,
    route: props.route,
    errorMessage: props.errorMessage,
    createdAt: props.createdAt.toISOString(),
  };
}

export function toAuditLogId(id: string): AuditLogId {
  return id as AuditLogId;
}

export function toAuditListQuery(input: ListAuditInput): AuditListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId,
    action: input.action,
    fromDate: input.fromDate,
    toDate: input.toDate,
  };
}
