import { SemanticBadge } from "@/components/design-system/badge";
import type { PurchaseOrderStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type ProcurementStatusBadgeProps = {
  status: PurchaseOrderStatus;
};

const statusSemantic: Record<
  PurchaseOrderStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  DRAFT: "draft",
  APPROVED: "pending",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "inactive",
};

export function ProcurementStatusBadge({ status }: ProcurementStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
