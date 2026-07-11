"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCompleteRepair } from "../hooks";
import type { RepairResponse } from "../types";

type CompleteRepairDialogProps = {
  repair: RepairResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CompleteRepairDialog({
  repair,
  open,
  onOpenChange,
}: CompleteRepairDialogProps) {
  const completeMutation = useCompleteRepair();

  if (!repair) {
    return null;
  }

  const handleConfirm = async () => {
    await completeMutation.mutateAsync(repair.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Complete repair"
      description={`Complete repair "${repair.repairNumber}"? Repaired items will be restocked to inventory.`}
      confirmLabel="Complete repair"
      onConfirm={() => void handleConfirm()}
      isLoading={completeMutation.isPending}
    />
  );
}
