import { SemanticBadge } from "@/components/design-system/badge";
import type { PaymentStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type PaymentRecordStatusBadgeProps = {
  status: PaymentStatus;
};

const statusSemantic: Record<
  PaymentStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  PENDING: "pending",
  POSTED: "success",
  VOID: "inactive",
};

export function PaymentRecordStatusBadge({ status }: PaymentRecordStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
