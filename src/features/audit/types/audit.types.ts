import type { PaginationMeta } from "@/types/api";

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "RESTORE",
  "LOGIN",
  "LOGOUT",
  "FAILED_LOGIN",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "APPROVE",
  "REJECT",
  "CANCEL",
  "DISPATCH",
  "RETURN",
  "PAYMENT_RECEIVED",
  "EXPENSE_RECORDED",
  "EXPORT",
  "IMPORT",
  "PRINT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_STATUSES = ["SUCCESS", "FAILED", "WARNING"] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export type AuditValues = Record<string, unknown>;

export type AuditLogResponse = {
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
};

export type AuditLogListResponse = {
  items: AuditLogResponse[];
  meta: PaginationMeta;
};

export type AuditSortField =
  | "createdAt"
  | "module"
  | "entityName"
  | "recordId"
  | "action"
  | "status"
  | "userId";

export type ListAuditLogsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: AuditSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  fromDate?: string;
  toDate?: string;
};

export type TableDensity = "compact" | "comfortable" | "spacious";
