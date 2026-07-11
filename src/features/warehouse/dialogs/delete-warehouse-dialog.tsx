"use client";

import { DeleteModal } from "@/components/design-system/modal";
import { useDeleteWarehouse } from "../hooks";
import type { WarehouseResponse } from "../types";

type DeleteWarehouseDialogProps = {
  warehouse: WarehouseResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteWarehouseDialog({
  warehouse,
  open,
  onOpenChange,
  onDeleted,
}: DeleteWarehouseDialogProps) {
  const deleteMutation = useDeleteWarehouse();

  const handleConfirm = async () => {
    if (!warehouse) {
      return;
    }

    await deleteMutation.mutateAsync(warehouse.id);
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <DeleteModal
      open={open}
      onOpenChange={onOpenChange}
      entityName={warehouse ? `"${warehouse.name}"` : "this warehouse"}
      onConfirm={() => void handleConfirm()}
      isLoading={deleteMutation.isPending}
    />
  );
}
