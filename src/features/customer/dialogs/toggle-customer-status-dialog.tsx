"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useToggleCustomerStatus } from "../hooks";
import type { CustomerResponse } from "../types";

type ToggleCustomerStatusDialogProps = {
  customer: CustomerResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToggleCustomerStatusDialog({
  customer,
  open,
  onOpenChange,
}: ToggleCustomerStatusDialogProps) {
  const toggleMutation = useToggleCustomerStatus();

  if (!customer) {
    return null;
  }

  const nextActive = !customer.isActive;

  const handleConfirm = async () => {
    await toggleMutation.mutateAsync({ id: customer.id, isActive: nextActive });
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={nextActive ? "Activate customer" : "Deactivate customer"}
      description={
        nextActive
          ? `Activate "${customer.name}"? They will be available for new rentals.`
          : `Deactivate "${customer.name}"? They will not be available for new rentals.`
      }
      confirmLabel={nextActive ? "Activate" : "Deactivate"}
      onConfirm={() => void handleConfirm()}
      isLoading={toggleMutation.isPending}
    />
  );
}
