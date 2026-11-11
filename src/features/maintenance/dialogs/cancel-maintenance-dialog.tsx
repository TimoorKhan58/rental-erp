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
      description={
        maintenance.status === "IN_PROGRESS" || maintenance.startedAt
          ? `Cancel "${maintenance.maintenanceNumber}"? Quantity taken out at start will be returned to inventory. This cannot be undone.`
          : `Cancel "${maintenance.maintenanceNumber}"? Inventory is unchanged because stock is only removed when maintenance starts. This cannot be undone.`
      }
      confirmLabel="Cancel maintenance"
      onConfirm={() => void handleConfirm()}
      isLoading={cancelMutation.isPending}
    />
  );
}
