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

export const AUDIT_STATUSES = ["SUCCESS", "FAILED", "WARNING"] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export type AuditValues = Record<string, unknown>;

export interface AuditContext {
  userId?: string;
  module?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  httpMethod?: string;
  route?: string;
}

export interface AuditEntry {
  module: string;
  entityName: string;
  recordId: string;
  action: AuditAction;
  status: AuditStatus;
  oldValues?: AuditValues;
  newValues?: AuditValues;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  errorMessage?: string;
}

export interface AuditFailureEntry {
  module: string;
  entityName: string;
  recordId: string;
  action: AuditAction;
  oldValues?: AuditValues;
  newValues?: AuditValues;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  error: unknown;
  errorMessage?: string;
}

export interface IAuditLogger {
  log(entry: AuditEntry): Promise<void>;
  logFailure(entry: AuditFailureEntry): Promise<void>;
}
