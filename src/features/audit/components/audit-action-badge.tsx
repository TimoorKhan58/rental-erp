import { SemanticBadge } from "@/components/design-system/badge";
import type { AuditAction } from "../types";
import { ACTION_LABELS } from "../mappers";

type AuditActionBadgeProps = {
  action: AuditAction;
};

const actionSemantic: Record<
  AuditAction,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  CREATE: "success",
  UPDATE: "pending",
  DELETE: "warning",
  RESTORE: "success",
  LOGIN: "draft",
  LOGOUT: "inactive",
  FAILED_LOGIN: "warning",
  PASSWORD_CHANGED: "pending",
  PASSWORD_RESET: "pending",
  APPROVE: "success",
  REJECT: "warning",
  CANCEL: "inactive",
  DISPATCH: "pending",
  RETURN: "pending",
  PAYMENT_RECEIVED: "success",
  EXPENSE_RECORDED: "pending",
  EXPORT: "draft",
  IMPORT: "draft",
  PRINT: "draft",
};

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  return (
    <SemanticBadge semantic={actionSemantic[action]}>
      {ACTION_LABELS[action]}
    </SemanticBadge>
  );
}
