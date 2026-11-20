"use client";

import { useState } from "react";
import { AppModal } from "@/components/design-system/modal";
import { AppButton } from "@/components/design-system/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
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
  // Asked here because the job can no longer be edited once started (QA R3).
  const [actualCost, setActualCost] = useState("");

  if (!maintenance) {
    return null;
  }

  const trimmed = actualCost.trim();
  const parsedCost = trimmed === "" ? undefined : Number(trimmed);
  const costInvalid = parsedCost !== undefined && (!Number.isFinite(parsedCost) || parsedCost < 0);

  const handleConfirm = async () => {
    await completeMutation.mutateAsync({ id: maintenance.id, actualCost: parsedCost });
    setActualCost("");
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Complete maintenance"
      description={`Finish ${maintenance.maintenanceNumber}. The ${maintenance.quantity} item(s) go back into stock and can be rented again.`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="maintenance-actual-cost">
            What did it actually cost? (optional)
          </label>
          <Input
            id="maintenance-actual-cost"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder={`Estimated ${formatCurrency(maintenance.estimatedCost)}`}
            value={actualCost}
            onChange={(event) => setActualCost(event.target.value)}
            aria-invalid={costInvalid}
          />
          <p className="text-xs text-muted-foreground">
            {costInvalid
              ? "Enter an amount of zero or more."
              : "Kept on this job for your records. Record the payment itself as an expense."}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Not yet
          </AppButton>
          <AppButton
            loading={completeMutation.isPending}
            disabled={costInvalid}
            onClick={() => void handleConfirm()}
          >
            Complete maintenance
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}
