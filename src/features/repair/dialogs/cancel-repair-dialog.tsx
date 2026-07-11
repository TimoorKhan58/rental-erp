"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCancelRepair } from "../hooks";
import type { RepairResponse } from "../types";

type CancelRepairDialogProps = {
  repair: RepairResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
};

export function CancelRepairDialog({
  repair,
  open,
  onOpenChange,
  onCancelled,
}: CancelRepairDialogProps) {
  const cancelMutation = useCancelRepair();

  if (!repair) {
    return null;
  }

  const handleConfirm = async () => {
    await cancelMutation.mutateAsync(repair.id);
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel repair"
      description={`Cancel repair "${repair.repairNumber}"? This action cannot be undone.`}
      confirmLabel="Cancel repair"
      onConfirm={() => void handleConfirm()}
      isLoading={cancelMutation.isPending}
    />
  );
}
