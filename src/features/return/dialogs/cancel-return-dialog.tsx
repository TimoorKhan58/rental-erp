"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCancelReturn } from "../hooks";
import type { ReturnResponse } from "../types";

type CancelReturnDialogProps = {
  returnRecord: ReturnResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
};

export function CancelReturnDialog({
  returnRecord,
  open,
  onOpenChange,
  onCancelled,
}: CancelReturnDialogProps) {
  const cancelMutation = useCancelReturn();

  if (!returnRecord) {
    return null;
  }

  const handleConfirm = async () => {
    await cancelMutation.mutateAsync(returnRecord.id);
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel return"
      description={`Cancel "${returnRecord.returnNumber}"? This action cannot be undone.`}
      confirmLabel="Cancel return"
      onConfirm={() => void handleConfirm()}
      isLoading={cancelMutation.isPending}
    />
  );
}
