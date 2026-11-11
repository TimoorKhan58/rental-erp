"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { formatCurrency } from "@/lib/utils";
import { useVoidPayment } from "../hooks";
import type { PaymentResponse } from "../types";

type VoidPaymentDialogProps = {
  payment: PaymentResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoided?: () => void;
};

export function VoidPaymentDialog({
  payment,
  open,
  onOpenChange,
  onVoided,
}: VoidPaymentDialogProps) {
  const voidMutation = useVoidPayment();

  if (!payment) {
    return null;
  }

  const handleConfirm = async () => {
    await voidMutation.mutateAsync(payment.id);
    onOpenChange(false);
    onVoided?.();
  };

  const description =
    payment.status === "POSTED"
      ? `Void "${payment.paymentNumber}" (${formatCurrency(payment.amount)})? This reverses the posted payment on the linked invoice. Accounting settlement remains server-enforced.`
      : `Void "${payment.paymentNumber}" (${formatCurrency(payment.amount)})? This cancels the pending payment. The invoice is not settled until a payment is posted.`;

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Void payment"
      destructive
      description={description}
      confirmLabel="Void payment"
      onConfirm={() => void handleConfirm()}
      isLoading={voidMutation.isPending}
    />
  );
}
