"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { formatCurrency } from "@/lib/utils";
import { usePostPayment } from "../hooks";
import type { PaymentResponse } from "../types";

type PostPaymentDialogProps = {
  payment: PaymentResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PostPaymentDialog({
  payment,
  open,
  onOpenChange,
}: PostPaymentDialogProps) {
  const postMutation = usePostPayment();

  if (!payment) {
    return null;
  }

  const handleConfirm = async () => {
    await postMutation.mutateAsync(payment.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Post payment"
      description={`Post "${payment.paymentNumber}" for ${formatCurrency(payment.amount)}? This will apply the payment to the linked invoice.`}
      confirmLabel="Post payment"
      onConfirm={() => void handleConfirm()}
      isLoading={postMutation.isPending}
    />
  );
}
