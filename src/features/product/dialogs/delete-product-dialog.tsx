"use client";

import { DeleteModal } from "@/components/design-system/modal";
import { useDeleteProduct } from "../hooks";
import type { ProductResponse } from "../types";

type DeleteProductDialogProps = {
  product: ProductResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
  onDeleted,
}: DeleteProductDialogProps) {
  const deleteMutation = useDeleteProduct();

  const handleConfirm = async () => {
    if (!product) {
      return;
    }

    await deleteMutation.mutateAsync(product.id);
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <DeleteModal
      open={open}
      onOpenChange={onOpenChange}
      entityName={product ? `"${product.name}"` : "this product"}
      onConfirm={() => void handleConfirm()}
      isLoading={deleteMutation.isPending}
    />
  );
}
