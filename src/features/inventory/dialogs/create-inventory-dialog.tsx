"use client";

import { AppModal } from "@/components/design-system/modal";
import { toCreateInventoryPayload } from "../mappers";
import { useCreateInventory } from "../hooks";
import { InventoryForm } from "../forms";
import type { CreateInventoryFormValues } from "../schemas";

type CreateInventoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateInventoryDialog({ open, onOpenChange }: CreateInventoryDialogProps) {
  const createMutation = useCreateInventory();

  const handleSubmit = async (values: CreateInventoryFormValues) => {
    await createMutation.mutateAsync(toCreateInventoryPayload(values));
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create inventory record"
      description="Assign stock for a product at a warehouse."
      size="xl"
    >
      <InventoryForm
        mode="create"
        onCancel={() => onOpenChange(false)}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
    </AppModal>
  );
}
