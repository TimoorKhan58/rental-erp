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
      description={`Complete "${returnRecord.returnNumber}"? Good items will be restocked to inventory.`}
      confirmLabel="Complete return"
      onConfirm={() => void handleConfirm()}
      isLoading={completeMutation.isPending}
    />
  );
}
