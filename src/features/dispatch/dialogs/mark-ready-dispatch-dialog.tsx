"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useMarkDispatchReady } from "../hooks";
import type { DispatchResponse } from "../types";

type MarkReadyDispatchDialogProps = {
  dispatch: DispatchResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MarkReadyDispatchDialog({
  dispatch,
  open,
  onOpenChange,
}: MarkReadyDispatchDialogProps) {
  const markReadyMutation = useMarkDispatchReady();

  if (!dispatch) {
    return null;
  }

  const handleConfirm = async () => {
    await markReadyMutation.mutateAsync(dispatch.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Mark dispatch ready"
      description={`Mark "${dispatch.dispatchNumber}" as ready for completion?`}
      confirmLabel="Mark ready"
      onConfirm={() => void handleConfirm()}
      isLoading={markReadyMutation.isPending}
    />
  );
}
