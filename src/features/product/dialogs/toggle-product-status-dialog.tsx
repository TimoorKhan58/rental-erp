"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useToggleProductStatus } from "../hooks";
import type { ProductResponse } from "../types";

type ToggleProductStatusDialogProps = {
  product: ProductResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToggleProductStatusDialog({
  product,
  open,
  onOpenChange,
}: ToggleProductStatusDialogProps) {
  const toggleMutation = useToggleProductStatus();

  if (!product) {
    return null;
  }

  const nextActive = !product.isActive;

  const handleConfirm = async () => {
    await toggleMutation.mutateAsync({ id: product.id, isActive: nextActive });
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={nextActive ? "Activate product" : "Deactivate product"}
      description={
        nextActive
          ? `Activate "${product.name}"? It will be available for new rentals.`
          : `Deactivate "${product.name}"? It will not be available for new rentals.`
      }
      confirmLabel={nextActive ? "Activate" : "Deactivate"}
      onConfirm={() => void handleConfirm()}
      isLoading={toggleMutation.isPending}
    />
  );
}
