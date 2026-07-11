"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { formatCurrency } from "@/lib/utils";
import { useIssueRentalInvoice } from "../hooks";
import type { RentalInvoiceResponse } from "../types";

type IssueRentalInvoiceDialogProps = {
  invoice: RentalInvoiceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IssueRentalInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: IssueRentalInvoiceDialogProps) {
  const issueMutation = useIssueRentalInvoice();

  if (!invoice) {
    return null;
  }

  const handleConfirm = async () => {
    await issueMutation.mutateAsync(invoice.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Issue invoice"
      description={`Issue "${invoice.invoiceNumber}"? The invoice will become payable with a balance of ${formatCurrency(invoice.grandTotal)}.`}
      confirmLabel="Issue invoice"
      onConfirm={() => void handleConfirm()}
      isLoading={issueMutation.isPending}
    />
  );
}
