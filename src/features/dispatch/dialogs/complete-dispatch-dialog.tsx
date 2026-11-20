"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCompleteDispatch } from "../hooks";
import type { DispatchResponse } from "../types";

type CompleteDispatchDialogProps = {
  dispatch: DispatchResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CompleteDispatchDialog({
  dispatch,
  open,
  onOpenChange,
}: CompleteDispatchDialogProps) {
  const completeMutation = useCompleteDispatch();

  if (!dispatch) {
    return null;
  }

  const handleConfirm = async () => {
    await completeMutation.mutateAsync(dispatch.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Mark as sent"
      description={`Complete "${dispatch.dispatchNumber}"? The items leave your stock and the order shows as out with the customer.`}
      confirmLabel="Mark as sent"
      onConfirm={() => void handleConfirm()}
      isLoading={completeMutation.isPending}
    />
  );
}
