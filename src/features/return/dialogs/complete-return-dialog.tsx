"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useCompleteReturn } from "../hooks";
import type { ReturnResponse } from "../types";

type CompleteReturnDialogProps = {
  returnRecord: ReturnResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CompleteReturnDialog({
  returnRecord,
  open,
  onOpenChange,
}: CompleteReturnDialogProps) {
  const completeMutation = useCompleteReturn();

  if (!returnRecord) {
    return null;
  }

  const handleConfirm = async () => {
    await completeMutation.mutateAsync(returnRecord.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Complete return"
      description={`Complete "${returnRecord.returnNumber}"? Owned GOOD quantity is restocked and owned returned quantity releases reservation. Damaged, lost, missing, and external quantities are not added back to owned available stock. The rental order may move to Partially returned, Returned, or Completed. Server rules remain authoritative.`}
      confirmLabel="Complete return"
      onConfirm={() => void handleConfirm()}
      isLoading={completeMutation.isPending}
    />
  );
}
