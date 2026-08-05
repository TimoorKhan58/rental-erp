"use client";

import { AppModal } from "@/components/design-system/modal";
import { toCreateUserPayload } from "../mappers";
import { useCreateUser } from "../hooks";
import { UserForm } from "../forms";
import type { CreateUserFormValues } from "../schemas";
import type { UserResponse } from "../types";

type CreateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (user: UserResponse) => void;
};

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateUserDialogProps) {
  const createMutation = useCreateUser();

  const handleSubmit = async (values: CreateUserFormValues) => {
    const user = await createMutation.mutateAsync(toCreateUserPayload(values));
    onCreated?.(user);
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="New user"
      description="Create an enterprise user account with role and status."
      size="xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      <UserForm
        mode="create"
        layout="dialog"
        onCancel={() => onOpenChange(false)}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
    </AppModal>
  );
}
