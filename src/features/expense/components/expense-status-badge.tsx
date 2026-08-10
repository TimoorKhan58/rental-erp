import { SemanticBadge } from "@/components/design-system/badge";
import type { ExpenseStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type ExpenseStatusBadgeProps = {
  status: ExpenseStatus;
};

const statusSemantic: Record<
  ExpenseStatus,
  "draft" | "pending" | "success" | "warning" | "inactive" | "error" | "paid"
> = {
  DRAFT: "draft",
  SUBMITTED: "pending",
  APPROVED: "success",
  REJECTED: "error",
  PAID: "paid",
};

export function ExpenseStatusBadge({ status }: ExpenseStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
