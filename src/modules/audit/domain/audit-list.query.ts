import type { AuditAction } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface AuditListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  fromDate?: Date;
  toDate?: Date;
}
