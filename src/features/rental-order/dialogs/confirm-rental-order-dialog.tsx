"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useConfirmRentalOrder } from "../hooks";
import type { RentalOrderResponse } from "../types";

type ConfirmRentalOrderDialogProps = {
  order: RentalOrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConfirmRentalOrderDialog({
  order,
  open,
  onOpenChange,
}: ConfirmRentalOrderDialogProps) {
  const confirmMutation = useConfirmRentalOrder();

  if (!order) {
    return null;
  }

  const handleConfirm = async () => {
    await confirmMutation.mutateAsync(order.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm rental order"
      description={`Confirm "${order.orderNumber}"? Inventory can be reserved after confirmation.`}
      confirmLabel="Confirm"
      onConfirm={() => void handleConfirm()}
      isLoading={confirmMutation.isPending}
    />
  );
}
