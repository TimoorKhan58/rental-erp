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
      description={`Complete "${returnRecord.returnNumber}"? Good items go back into stock. Damaged, lost and hired-in items do not. The order is updated to show what has come back.`}
      confirmLabel="Complete return"
      onConfirm={() => void handleConfirm()}
      isLoading={completeMutation.isPending}
    />
  );
}
