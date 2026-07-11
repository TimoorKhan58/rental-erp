import { SemanticBadge } from "@/components/design-system/badge";
import { getPaymentStatusLabel } from "../mappers";
import type { RentalInvoiceStatus } from "../types";

type PaymentStatusBadgeProps = {
  status: RentalInvoiceStatus;
  balance: number;
  paidAmount: number;
};

const paymentSemantic: Record<string, "pending" | "success" | "warning" | "inactive"> = {
  Unpaid: "pending",
  "Partially paid": "warning",
  Paid: "success",
  Void: "inactive",
};

export function PaymentStatusBadge({
  status,
  balance,
  paidAmount,
}: PaymentStatusBadgeProps) {
  const label = getPaymentStatusLabel({ status, balance, paidAmount });

  return (
    <SemanticBadge semantic={paymentSemantic[label] ?? "pending"}>
      {label}
    </SemanticBadge>
  );
}
