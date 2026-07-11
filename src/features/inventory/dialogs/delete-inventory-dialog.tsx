"use client";

import { DeleteModal } from "@/components/design-system/modal";
import { useDeleteInventory, useInventoryFilterOptions } from "../hooks";
import type { InventoryResponse } from "../types";

type DeleteInventoryDialogProps = {
  inventory: InventoryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteInventoryDialog({
  inventory,
  open,
  onOpenChange,
  onDeleted,
}: DeleteInventoryDialogProps) {
  const deleteMutation = useDeleteInventory();
  const { productLabelById, warehouseLabelById } = useInventoryFilterOptions();

  const handleConfirm = async () => {
    if (!inventory) {
      return;
    }

    await deleteMutation.mutateAsync(inventory.id);
    onOpenChange(false);
    onDeleted?.();
  };

  const productLabel = inventory
    ? (productLabelById.get(inventory.productId) ?? inventory.productId)
    : "this record";
  const warehouseLabel = inventory
    ? (warehouseLabelById.get(inventory.warehouseId) ?? inventory.warehouseId)
    : "";

  const entityName = inventory
    ? `"${productLabel}" at "${warehouseLabel}"`
    : "this inventory record";

  return (
    <DeleteModal
      open={open}
      onOpenChange={onOpenChange}
      entityName={entityName}
      onConfirm={() => void handleConfirm()}
      isLoading={deleteMutation.isPending}
    />
  );
}
