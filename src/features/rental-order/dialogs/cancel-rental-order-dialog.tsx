"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCancelRentalOrder } from "../hooks";
import type { RentalOrderResponse } from "../types";

type CancelRentalOrderDialogProps = {
  order: RentalOrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
};

export function CancelRentalOrderDialog({
  order,
  open,
  onOpenChange,
  onCancelled,
}: CancelRentalOrderDialogProps) {
  const cancelMutation = useCancelRentalOrder();

  if (!order) {
    return null;
  }

  const handleConfirm = async () => {
    await cancelMutation.mutateAsync(order.id);
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel rental order"
      description={`Cancel "${order.orderNumber}"? This action cannot be undone.`}
      confirmLabel="Cancel order"
      onConfirm={() => void handleConfirm()}
      isLoading={cancelMutation.isPending}
    />
  );
}
