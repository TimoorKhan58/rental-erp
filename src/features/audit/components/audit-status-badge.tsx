import { SemanticBadge } from "@/components/design-system/badge";
import type { AuditStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type AuditStatusBadgeProps = {
  status: AuditStatus;
};

const statusSemantic: Record<
  AuditStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  SUCCESS: "success",
  FAILED: "warning",
  WARNING: "pending",
};

export function AuditStatusBadge({ status }: AuditStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
