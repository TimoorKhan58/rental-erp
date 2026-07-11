"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useInventoryFilterOptions, useToggleInventoryStatus } from "../hooks";
import type { InventoryResponse } from "../types";

type ToggleInventoryStatusDialogProps = {
  inventory: InventoryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToggleInventoryStatusDialog({
  inventory,
  open,
  onOpenChange,
}: ToggleInventoryStatusDialogProps) {
  const toggleMutation = useToggleInventoryStatus();
  const { productLabelById, warehouseLabelById } = useInventoryFilterOptions();

  if (!inventory) {
    return null;
  }

  const nextActive = !inventory.isActive;
  const productLabel = productLabelById.get(inventory.productId) ?? inventory.productId;
  const warehouseLabel =
    warehouseLabelById.get(inventory.warehouseId) ?? inventory.warehouseId;

  const handleConfirm = async () => {
    await toggleMutation.mutateAsync({ id: inventory.id, isActive: nextActive });
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={nextActive ? "Activate inventory record" : "Deactivate inventory record"}
      description={
        nextActive
          ? `Activate inventory for "${productLabel}" at "${warehouseLabel}"?`
          : `Deactivate inventory for "${productLabel}" at "${warehouseLabel}"?`
      }
      confirmLabel={nextActive ? "Activate" : "Deactivate"}
      onConfirm={() => void handleConfirm()}
      isLoading={toggleMutation.isPending}
    />
  );
}
