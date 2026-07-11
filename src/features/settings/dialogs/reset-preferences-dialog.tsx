"use client";

import { ConfirmationModal } from "@/components/design-system/modal";

type ResetPreferencesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
};

export function ResetPreferencesDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ResetPreferencesDialogProps) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reset preferences?"
      description="This restores locale, format, and dashboard preference fields to the system defaults and saves them to the server."
      confirmLabel={isPending ? "Resetting..." : "Reset preferences"}
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      isLoading={isPending}
    />
  );
}
