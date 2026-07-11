"use client";

import { ConfirmModal } from "@/components/design-system/modal";
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
      ? `Void "${payment.paymentNumber}"? This will reverse the payment on the linked invoice.`
      : `Void "${payment.paymentNumber}"? This will cancel the pending payment.`;

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Void payment"
      description={description}
      confirmLabel="Void payment"
      onConfirm={() => void handleConfirm()}
      isLoading={voidMutation.isPending}
    />
  );
}
