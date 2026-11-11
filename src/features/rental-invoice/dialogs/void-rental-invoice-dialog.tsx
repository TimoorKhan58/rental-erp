"use client";

import { useQuery } from "@tanstack/react-query";
import { ConfirmModal } from "@/components/design-system/modal";
import { queryKeys } from "@/lib/query";
import { formatCurrency } from "@/lib/utils";
import { getPayments } from "@/features/payment/services";
import { useVoidRentalInvoice } from "../hooks";
import type { RentalInvoiceResponse } from "../types";

type VoidRentalInvoiceDialogProps = {
  invoice: RentalInvoiceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoided?: () => void;
};

/**
 * Presentation of posted-payment protection.
 * Server remains authoritative: void is rejected when POSTED payments exist.
 * UI disables confirm when posted payments are visible from the payments API.
 */
export function VoidRentalInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onVoided,
}: VoidRentalInvoiceDialogProps) {
  const voidMutation = useVoidRentalInvoice();
  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments.list({
      rentalInvoiceId: invoice?.id,
      page: 1,
      pageSize: 50,
      sortBy: "paymentDate",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getPayments({
        rentalInvoiceId: invoice!.id,
        page: 1,
        pageSize: 50,
        sortBy: "paymentDate",
        sortOrder: "desc",
      }),
    enabled: open && Boolean(invoice?.id),
    staleTime: 30_000,
  });

  if (!invoice) {
    return null;
  }

  const payments = paymentsQuery.data?.items ?? [];
  const postedPayments = payments.filter((payment) => payment.status === "POSTED");
  const hasPostedPayments = postedPayments.length > 0;
  const isCheckingPayments = open && paymentsQuery.isLoading;

  const handleConfirm = async () => {
    if (hasPostedPayments) {
      return;
    }

    await voidMutation.mutateAsync(invoice.id);
    onOpenChange(false);
    onVoided?.();
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Void invoice"
      destructive
      confirmDisabled={hasPostedPayments || isCheckingPayments}
      description={
        <span className="block space-y-2">
          <span className="block">
            Void &quot;{invoice.invoiceNumber}&quot; ({formatCurrency(invoice.grandTotal)})? This
            cannot be undone.
          </span>
          {isCheckingPayments ? (
            <span className="block text-muted-foreground">Checking linked payments…</span>
          ) : null}
          {hasPostedPayments ? (
            <span className="block rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-destructive">
              This invoice has {postedPayments.length} POSTED payment
              {postedPayments.length === 1 ? "" : "s"}. Void is blocked — server policy rejects
              voiding invoices with posted payments.
            </span>
          ) : (
            <span className="block text-muted-foreground">
              If any payment is later posted, the server will still reject void. Pending payments
              do not settle the invoice until posted.
            </span>
          )}
        </span>
      }
      confirmLabel="Void invoice"
      onConfirm={() => void handleConfirm()}
      isLoading={voidMutation.isPending}
    />
  );
}
