"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCancelProcurement } from "../hooks";
import type { ProcurementResponse } from "../types";

type CancelProcurementDialogProps = {
  procurement: ProcurementResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
};

export function CancelProcurementDialog({
  procurement,
  open,
  onOpenChange,
  onCancelled,
}: CancelProcurementDialogProps) {
  const cancelMutation = useCancelProcurement();

  if (!procurement) {
    return null;
  }

  const handleConfirm = async () => {
    await cancelMutation.mutateAsync(procurement.id);
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel purchase order"
      description={`Cancel "${procurement.poNumber}"? This action cannot be undone.`}
      confirmLabel="Cancel order"
      onConfirm={() => void handleConfirm()}
      isLoading={cancelMutation.isPending}
    />
  );
}
