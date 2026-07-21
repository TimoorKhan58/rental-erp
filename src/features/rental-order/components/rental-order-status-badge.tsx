import { SemanticBadge } from "@/components/design-system/badge";
import type { RentalOrderStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type RentalOrderStatusBadgeProps = {
  status: RentalOrderStatus;
};

const statusSemantic: Record<
  RentalOrderStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  DRAFT: "draft",
  CONFIRMED: "pending",
  RESERVED: "success",
  DISPATCHED: "warning",
  ON_RENT: "warning",
  PARTIALLY_RETURNED: "pending",
  RETURNED: "success",
  COMPLETED: "success",
  CANCELLED: "inactive",
};

export function RentalOrderStatusBadge({ status }: RentalOrderStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
