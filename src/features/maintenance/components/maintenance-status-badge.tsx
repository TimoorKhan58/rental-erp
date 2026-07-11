import { SemanticBadge } from "@/components/design-system/badge";
import type { MaintenanceStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type MaintenanceStatusBadgeProps = {
  status: MaintenanceStatus;
};

const statusSemantic: Record<
  MaintenanceStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  SCHEDULED: "draft",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "inactive",
};

export function MaintenanceStatusBadge({ status }: MaintenanceStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
