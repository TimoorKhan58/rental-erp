export const AUDIT_MODULE = "audit";

export const AUDIT_SEARCH_FIELDS = [
  "module",
  "entityName",
  "recordId",
  "route",
  "requestId",
] as const;

export const AUDIT_SORT_FIELDS = [
  "createdAt",
  "module",
  "entityName",
  "recordId",
  "action",
  "status",
  "userId",
] as const;

export type AuditSortField = (typeof AUDIT_SORT_FIELDS)[number];
