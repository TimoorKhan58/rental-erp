"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCancelMaintenance } from "../hooks";
import type { MaintenanceResponse } from "../types";

type CancelMaintenanceDialogProps = {
  maintenance: MaintenanceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
};

export function CancelMaintenanceDialog({
  maintenance,
  open,
  onOpenChange,
  onCancelled,
}: CancelMaintenanceDialogProps) {
  const cancelMutation = useCancelMaintenance();

  if (!maintenance) {
    return null;
  }

  const handleConfirm = async () => {
    await cancelMutation.mutateAsync(maintenance.id);
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel maintenance"
      description={`Cancel maintenance "${maintenance.maintenanceNumber}"? This action cannot be undone.`}
      confirmLabel="Cancel maintenance"
      onConfirm={() => void handleConfirm()}
      isLoading={cancelMutation.isPending}
    />
  );
}
