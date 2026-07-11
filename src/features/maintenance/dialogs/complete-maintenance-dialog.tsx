"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCompleteMaintenance } from "../hooks";
import type { MaintenanceResponse } from "../types";

type CompleteMaintenanceDialogProps = {
  maintenance: MaintenanceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CompleteMaintenanceDialog({
  maintenance,
  open,
  onOpenChange,
}: CompleteMaintenanceDialogProps) {
  const completeMutation = useCompleteMaintenance();

  if (!maintenance) {
    return null;
  }

  const handleConfirm = async () => {
    await completeMutation.mutateAsync(maintenance.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Complete maintenance"
      description={`Complete maintenance "${maintenance.maintenanceNumber}"? Items will be returned to inventory.`}
      confirmLabel="Complete maintenance"
      onConfirm={() => void handleConfirm()}
      isLoading={completeMutation.isPending}
    />
  );
}
