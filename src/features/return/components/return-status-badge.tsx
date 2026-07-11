import { SemanticBadge } from "@/components/design-system/badge";
import type { ReturnStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type ReturnStatusBadgeProps = {
  status: ReturnStatus;
};

const statusSemantic: Record<
  ReturnStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  DRAFT: "draft",
  RECEIVED: "pending",
  INSPECTED: "warning",
  COMPLETED: "success",
  CANCELLED: "inactive",
};

export function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
