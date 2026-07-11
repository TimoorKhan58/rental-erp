"use client";

import { ConfirmationModal } from "@/components/design-system/modal";

type SaveChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
  description?: string;
};

export function SaveChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  description = "Save your changes to the server?",
}: SaveChangesDialogProps) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title="Save changes?"
      description={description}
      confirmLabel={isPending ? "Saving..." : "Save changes"}
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      isLoading={isPending}
    />
  );
}
