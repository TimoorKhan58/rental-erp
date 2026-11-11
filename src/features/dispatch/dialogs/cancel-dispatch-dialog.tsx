"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCancelDispatch } from "../hooks";
import type { DispatchResponse } from "../types";

type CancelDispatchDialogProps = {
  dispatch: DispatchResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
};

export function CancelDispatchDialog({
  dispatch,
  open,
  onOpenChange,
  onCancelled,
}: CancelDispatchDialogProps) {
  const cancelMutation = useCancelDispatch();

  if (!dispatch) {
    return null;
  }

  const handleConfirm = async () => {
    await cancelMutation.mutateAsync(dispatch.id);
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel dispatch"
      destructive
      description={`Cancel "${dispatch.dispatchNumber}"? Draft and ready dispatches can be cancelled. Inventory is not posted until a dispatch is completed.`}
      confirmLabel="Cancel dispatch"
      onConfirm={() => void handleConfirm()}
      isLoading={cancelMutation.isPending}
    />
  );
}
