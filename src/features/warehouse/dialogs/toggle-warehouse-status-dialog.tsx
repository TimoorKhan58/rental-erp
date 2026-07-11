"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useToggleWarehouseStatus } from "../hooks";
import type { WarehouseResponse } from "../types";

type ToggleWarehouseStatusDialogProps = {
  warehouse: WarehouseResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToggleWarehouseStatusDialog({
  warehouse,
  open,
  onOpenChange,
}: ToggleWarehouseStatusDialogProps) {
  const toggleMutation = useToggleWarehouseStatus();

  if (!warehouse) {
    return null;
  }

  const nextActive = !warehouse.isActive;

  const handleConfirm = async () => {
    await toggleMutation.mutateAsync({ id: warehouse.id, isActive: nextActive });
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={nextActive ? "Activate warehouse" : "Deactivate warehouse"}
      description={
        nextActive
          ? `Activate "${warehouse.name}"? It will be available for inventory operations.`
          : `Deactivate "${warehouse.name}"? It will not be available for new inventory assignments.`
      }
      confirmLabel={nextActive ? "Activate" : "Deactivate"}
      onConfirm={() => void handleConfirm()}
      isLoading={toggleMutation.isPending}
    />
  );
}
