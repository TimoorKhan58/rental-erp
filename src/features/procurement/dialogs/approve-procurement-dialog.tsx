"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useApproveProcurement } from "../hooks";
import type { ProcurementResponse } from "../types";

type ApproveProcurementDialogProps = {
  procurement: ProcurementResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApproveProcurementDialog({
  procurement,
  open,
  onOpenChange,
}: ApproveProcurementDialogProps) {
  const approveMutation = useApproveProcurement();

  if (!procurement) {
    return null;
  }

  const handleConfirm = async () => {
    await approveMutation.mutateAsync(procurement.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Approve purchase order"
      description={`Approve "${procurement.poNumber}"? Stock does not change yet. Once approved, you can receive the goods when they arrive.`}
      confirmLabel="Approve"
      onConfirm={() => void handleConfirm()}
      isLoading={approveMutation.isPending}
    />
  );
}
