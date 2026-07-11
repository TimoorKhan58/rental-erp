import { SemanticBadge } from "@/components/design-system/badge";
import type { RepairStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type RepairStatusBadgeProps = {
  status: RepairStatus;
};

const statusSemantic: Record<
  RepairStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  PENDING: "draft",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "inactive",
};

export function RepairStatusBadge({ status }: RepairStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
