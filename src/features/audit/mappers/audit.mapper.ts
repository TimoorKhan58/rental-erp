import type { AuditAction, AuditStatus } from "../types";

export const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  RESTORE: "Restore",
  LOGIN: "Login",
  LOGOUT: "Logout",
  FAILED_LOGIN: "Failed login",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_RESET: "Password reset",
  APPROVE: "Approve",
  REJECT: "Reject",
  CANCEL: "Cancel",
  DISPATCH: "Dispatch",
  RETURN: "Return",
  PAYMENT_RECEIVED: "Payment received",
  EXPENSE_RECORDED: "Expense recorded",
  EXPORT: "Export",
  IMPORT: "Import",
  PRINT: "Print",
};

export const STATUS_LABELS: Record<AuditStatus, string> = {
  SUCCESS: "Success",
  FAILED: "Failed",
  WARNING: "Warning",
};

export function getChangedFields(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): string[] {
  const keys = new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]);

  return [...keys].filter((key) => {
    const before = oldValues?.[key];
    const after = newValues?.[key];
    return JSON.stringify(before) !== JSON.stringify(after);
  });
}
