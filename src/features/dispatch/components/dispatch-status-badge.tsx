import { SemanticBadge } from "@/components/design-system/badge";
import type { DispatchStatus } from "../types";
import { getOperatorFacingStatusLabel } from "../mappers/dispatch-workflow-presentation.mapper";

type DispatchStatusBadgeProps = {
  status: DispatchStatus;
};

const statusSemantic: Record<
  DispatchStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  DRAFT: "draft",
  READY: "pending",
  DISPATCHED: "warning",
  COMPLETED: "success",
  CANCELLED: "inactive",
};

export function DispatchStatusBadge({ status }: DispatchStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {getOperatorFacingStatusLabel(status)}
    </SemanticBadge>
  );
}
