import { SemanticBadge } from "@/components/design-system/badge";
import type { AssetStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type AssetStatusBadgeProps = {
  status: AssetStatus;
};

const statusSemantic: Record<
  AssetStatus,
  "draft" | "pending" | "success" | "warning" | "inactive" | "error" | "info"
> = {
  ACTIVE: "success",
  UNDER_MAINTENANCE: "warning",
  TRANSFERRED: "info",
  DISPOSED: "inactive",
};

export function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
