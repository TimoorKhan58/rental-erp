"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useToggleSupplierStatus } from "../hooks";
import type { SupplierResponse } from "../types";

type ToggleSupplierStatusDialogProps = {
  supplier: SupplierResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToggleSupplierStatusDialog({
  supplier,
  open,
  onOpenChange,
}: ToggleSupplierStatusDialogProps) {
  const toggleMutation = useToggleSupplierStatus();

  if (!supplier) {
    return null;
  }

  const nextActive = !supplier.isActive;

  const handleConfirm = async () => {
    await toggleMutation.mutateAsync({ id: supplier.id, isActive: nextActive });
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={nextActive ? "Activate supplier" : "Deactivate supplier"}
      description={
        nextActive
          ? `Activate "${supplier.name}"? They will be available for new procurement.`
          : `Deactivate "${supplier.name}"? They will not be available for new procurement.`
      }
      confirmLabel={nextActive ? "Activate" : "Deactivate"}
      onConfirm={() => void handleConfirm()}
      isLoading={toggleMutation.isPending}
    />
  );
}
