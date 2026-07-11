"use client";

import { DeleteModal } from "@/components/design-system/modal";
import { useDeleteSupplier } from "../hooks";
import type { SupplierResponse } from "../types";

type DeleteSupplierDialogProps = {
  supplier: SupplierResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteSupplierDialog({
  supplier,
  open,
  onOpenChange,
  onDeleted,
}: DeleteSupplierDialogProps) {
  const deleteMutation = useDeleteSupplier();

  const handleConfirm = async () => {
    if (!supplier) {
      return;
    }

    await deleteMutation.mutateAsync(supplier.id);
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <DeleteModal
      open={open}
      onOpenChange={onOpenChange}
      entityName={supplier ? `"${supplier.name}"` : "this supplier"}
      onConfirm={() => void handleConfirm()}
      isLoading={deleteMutation.isPending}
    />
  );
}
