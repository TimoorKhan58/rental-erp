import { SemanticBadge } from "@/components/design-system/badge";
import type { RentalInvoiceStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type RentalInvoiceStatusBadgeProps = {
  status: RentalInvoiceStatus;
};

const statusSemantic: Record<
  RentalInvoiceStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  DRAFT: "draft",
  ISSUED: "pending",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  VOID: "inactive",
};

export function RentalInvoiceStatusBadge({ status }: RentalInvoiceStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
