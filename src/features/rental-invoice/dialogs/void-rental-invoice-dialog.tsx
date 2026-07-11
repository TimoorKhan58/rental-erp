"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useVoidRentalInvoice } from "../hooks";
import type { RentalInvoiceResponse } from "../types";

type VoidRentalInvoiceDialogProps = {
  invoice: RentalInvoiceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoided?: () => void;
};

export function VoidRentalInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onVoided,
}: VoidRentalInvoiceDialogProps) {
  const voidMutation = useVoidRentalInvoice();

  if (!invoice) {
    return null;
  }

  const handleConfirm = async () => {
    await voidMutation.mutateAsync(invoice.id);
    onOpenChange(false);
    onVoided?.();
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Void invoice"
      description={`Void "${invoice.invoiceNumber}"? This action cannot be undone.`}
      confirmLabel="Void invoice"
      onConfirm={() => void handleConfirm()}
      isLoading={voidMutation.isPending}
    />
  );
}
