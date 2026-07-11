"use client";

import { AppModal } from "@/components/design-system/modal";
import { toInventoryFormValues, toUpdateInventoryPayload } from "../mappers";
import { useUpdateInventory } from "../hooks";
import { InventoryForm } from "../forms";
import type { UpdateInventoryFormValues } from "../schemas";
import type { InventoryResponse } from "../types";

type EditInventoryDialogProps = {
  inventory: InventoryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditInventoryDialog({
  inventory,
  open,
  onOpenChange,
}: EditInventoryDialogProps) {
  const updateMutation = useUpdateInventory();

  if (!inventory) {
    return null;
  }

  const handleSubmit = async (values: UpdateInventoryFormValues) => {
    await updateMutation.mutateAsync({
      id: inventory.id,
      payload: toUpdateInventoryPayload(values),
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit inventory record"
      description="Update stock levels and thresholds for this product-warehouse assignment."
      size="xl"
    >
      <InventoryForm
        mode="edit"
        defaultValues={toInventoryFormValues(inventory)}
        onCancel={() => onOpenChange(false)}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </AppModal>
  );
}
