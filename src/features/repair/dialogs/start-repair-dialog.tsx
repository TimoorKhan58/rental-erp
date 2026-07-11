"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useStartRepair } from "../hooks";
import type { RepairResponse } from "../types";

type StartRepairDialogProps = {
  repair: RepairResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StartRepairDialog({
  repair,
  open,
  onOpenChange,
}: StartRepairDialogProps) {
  const startMutation = useStartRepair();

  if (!repair) {
    return null;
  }

  const handleConfirm = async () => {
    await startMutation.mutateAsync(repair.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Start repair"
      description={`Start repair "${repair.repairNumber}"? The job will move to in progress.`}
      confirmLabel="Start repair"
      onConfirm={() => void handleConfirm()}
      isLoading={startMutation.isPending}
    />
  );
}
