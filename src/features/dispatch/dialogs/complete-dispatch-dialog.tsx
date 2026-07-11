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
      title="Complete dispatch"
      description={`Complete "${dispatch.dispatchNumber}"? This will dispatch stock and finalize the delivery.`}
      confirmLabel="Complete dispatch"
      onConfirm={() => void handleConfirm()}
      isLoading={completeMutation.isPending}
    />
  );
}
