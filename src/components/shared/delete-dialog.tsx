"use client";

import { ConfirmDialog } from "./confirm-dialog";

type DeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName?: string;
  onConfirm: () => void;
  isLoading?: boolean;
};

export function DeleteDialog({
  open,
  onOpenChange,
  entityName = "this item",
  onConfirm,
  isLoading = false,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete confirmation"
      description={`Are you sure you want to delete ${entityName}? This action cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      isLoading={isLoading}
      destructive
    />
  );
}
