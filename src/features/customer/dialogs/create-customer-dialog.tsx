"use client";

import { AppModal } from "@/components/design-system/modal";
import { toCreateCustomerPayload } from "../mappers";
import { useCreateCustomer } from "../hooks";
import { CustomerForm } from "../forms";
import type { CreateCustomerFormValues } from "../schemas";
import type { CustomerResponse } from "../types";

type CreateCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (customer: CustomerResponse) => void;
};

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCustomerDialogProps) {
  const createMutation = useCreateCustomer();

  const handleSubmit = async (values: CreateCustomerFormValues) => {
    const customer = await createMutation.mutateAsync(toCreateCustomerPayload(values));
    onCreated?.(customer);
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="New customer"
      description="Create a customer and assign them to this rental order."
      size="xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      <CustomerForm
        mode="create"
        layout="dialog"
        onCancel={() => onOpenChange(false)}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
    </AppModal>
  );
}
