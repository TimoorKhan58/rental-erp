"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { formatCurrency } from "@/lib/utils";
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
      description={
        procurement.paidAmount > 0
          ? `Cancel "${procurement.poNumber}"? This cannot be undone. Inventory is unchanged because nothing has been received. Cancellation does not void supplier payments or reverse the recorded paid amount (${formatCurrency(procurement.paidAmount)}).`
          : `Cancel "${procurement.poNumber}"? This cannot be undone. Inventory is unchanged because nothing has been received. Cancellation does not void supplier payments or reverse paid amounts.`
      }
      confirmLabel="Cancel order"
      onConfirm={() => void handleConfirm()}
      isLoading={cancelMutation.isPending}
    />
  );
}
