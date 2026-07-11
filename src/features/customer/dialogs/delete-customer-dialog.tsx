"use client";

import { DeleteModal } from "@/components/design-system/modal";
import { useDeleteCustomer } from "../hooks";
import type { CustomerResponse } from "../types";

type DeleteCustomerDialogProps = {
  customer: CustomerResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteCustomerDialog({
  customer,
  open,
  onOpenChange,
  onDeleted,
}: DeleteCustomerDialogProps) {
  const deleteMutation = useDeleteCustomer();

  const handleConfirm = async () => {
    if (!customer) {
      return;
    }

    await deleteMutation.mutateAsync(customer.id);
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <DeleteModal
      open={open}
      onOpenChange={onOpenChange}
      entityName={customer ? `"${customer.name}"` : "this customer"}
      onConfirm={() => void handleConfirm()}
      isLoading={deleteMutation.isPending}
    />
  );
}
