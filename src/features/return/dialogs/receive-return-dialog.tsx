"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useReceiveReturn } from "../hooks";
import type { ReturnResponse } from "../types";

type ReceiveReturnDialogProps = {
  returnRecord: ReturnResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReceiveReturnDialog({
  returnRecord,
  open,
  onOpenChange,
}: ReceiveReturnDialogProps) {
  const receiveMutation = useReceiveReturn();

  if (!returnRecord) {
    return null;
  }

  const handleConfirm = async () => {
    await receiveMutation.mutateAsync(returnRecord.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Mark return as received"
      description={`Mark "${returnRecord.returnNumber}" as received? Items will be ready for inspection.`}
      confirmLabel="Mark received"
      onConfirm={() => void handleConfirm()}
      isLoading={receiveMutation.isPending}
    />
  );
}
