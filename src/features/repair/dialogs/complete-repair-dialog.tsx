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
      description={`Complete repair "${repair.repairNumber}"? This posts inventory IN for the repair quantity. Repair cost is recorded on this job only — it does not create an expense, invoice, or journal entry. Server rules remain authoritative.`}
      confirmLabel="Complete repair"
      onConfirm={() => void handleConfirm()}
      isLoading={completeMutation.isPending}
    />
  );
}
