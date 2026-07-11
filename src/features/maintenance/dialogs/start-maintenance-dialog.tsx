"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useStartMaintenance } from "../hooks";
import type { MaintenanceResponse } from "../types";

type StartMaintenanceDialogProps = {
  maintenance: MaintenanceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StartMaintenanceDialog({
  maintenance,
  open,
  onOpenChange,
}: StartMaintenanceDialogProps) {
  const startMutation = useStartMaintenance();

  if (!maintenance) {
    return null;
  }

  const handleConfirm = async () => {
    await startMutation.mutateAsync(maintenance.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Start maintenance"
      description={`Start maintenance "${maintenance.maintenanceNumber}"? Inventory will be reserved for this job.`}
      confirmLabel="Start maintenance"
      onConfirm={() => void handleConfirm()}
      isLoading={startMutation.isPending}
    />
  );
}
