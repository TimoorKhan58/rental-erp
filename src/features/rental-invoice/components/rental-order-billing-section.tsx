"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileTextIcon, ReceiptIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { SemanticBadge } from "@/components/design-system/badge";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import type { RentalOrderStatus } from "@/features/rental-order/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deriveRentalOrderBillingPresentation } from "../mappers";
import {
  useRentalInvoicePermissions,
  useRentalInvoices,
} from "../hooks";
import { GenerateRentalInvoiceDialog } from "../dialogs/generate-rental-invoice-dialog";
import { PaymentStatusBadge } from "./payment-status-badge";
import { RentalInvoiceStatusBadge } from "./rental-invoice-status-badge";

type RentalOrderBillingSectionProps = {
  rentalOrderId: string;
  /** Parent gate aligned with domain (e.g. rental order COMPLETED on rental detail). */
  canGenerate?: boolean;
  rentalOrderStatus?: RentalOrderStatus;
};

const billingSemantic: Record<
  ReturnType<typeof deriveRentalOrderBillingPresentation>["state"],
  "pending" | "success" | "warning" | "inactive" | "info"
> = {
  cancelled: "inactive",
  no_invoice_pending_completion: "pending",
  no_invoice_ready: "success",
  no_invoice_no_permission: "warning",
  invoice_exists: "info",
};

export function RentalOrderBillingSection({
  rentalOrderId,
  canGenerate = true,
  rentalOrderStatus = "DRAFT",
}: RentalOrderBillingSectionProps) {
  const { canCreate, canRead } = useRentalInvoicePermissions();
  const [generateOpen, setGenerateOpen] = useState(false);
  const invoicesQuery = useRentalInvoices({
    rentalOrderId,
    page: 1,
    pageSize: 10,
    sortOrder: "desc",
  });

  const invoices = invoicesQuery.data?.items ?? [];
  const activeInvoice = invoices.find((invoice) => invoice.status !== "VOID");

  const presentation = useMemo(
    () =>
      deriveRentalOrderBillingPresentation({
        rentalOrderStatus,
        canGenerate,
        canCreate,
        activeInvoice,
      }),
    [rentalOrderStatus, canGenerate, canCreate, activeInvoice],
  );

  const showGenerate =
    presentation.showGenerateAction && activeInvoice === undefined;

  if (!canRead) {
    return null;
  }

  return (
    <section id="customer-invoice" aria-label="Customer invoice and billing">
      <SectionCard
        title="Customer invoice"
        description="Billing for this rental order — linked invoice and collection status."
        actions={
          showGenerate ? (
            <AppButton
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              leftIcon={<ReceiptIcon className="size-4" aria-hidden="true" />}
              onClick={() => setGenerateOpen(true)}
            >
              Generate invoice
            </AppButton>
          ) : activeInvoice ? (
            <AppButton
              size="sm"
              variant="outline"
              leftIcon={<FileTextIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalInvoiceDetail(activeInvoice.id)} />}
            >
              Open invoice
            </AppButton>
          ) : null
        }
      >
        {invoicesQuery.isLoading ? (
          <LoadingState label="Loading invoices..." />
        ) : (
          <div className="space-y-4">
            <div
              className="rounded-md border border-border bg-muted/20 px-3 py-3 sm:px-4"
              role="status"
              aria-live="polite"
              aria-label="Billing status for this rental"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5 min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Billing state
                  </p>
                  <SemanticBadge semantic={billingSemantic[presentation.state]}>
                    {presentation.statusLabel}
                  </SemanticBadge>
                </div>
                {activeInvoice ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <RentalInvoiceStatusBadge status={activeInvoice.status} />
                    <PaymentStatusBadge
                      status={activeInvoice.status}
                      balance={activeInvoice.balance}
                      paidAmount={activeInvoice.paidAmount}
                    />
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {presentation.statusDescription}
              </p>
              {presentation.nextStep ? (
                <p className="mt-2 text-sm font-medium text-foreground">
                  Next: {presentation.nextStep}
                </p>
              ) : null}
            </div>

            {activeInvoice ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 min-w-0">
                  <p className="font-medium">{activeInvoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(activeInvoice.invoiceDate)} ·{" "}
                    {formatCurrency(activeInvoice.grandTotal)}
                    {activeInvoice.balance > 0
                      ? ` · ${formatCurrency(activeInvoice.balance)} due`
                      : " · Paid in full"}
                  </p>
                </div>
                <AppButton
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  leftIcon={<FileTextIcon className="size-4" aria-hidden="true" />}
                  render={<Link href={ROUTES.rentalInvoiceDetail(activeInvoice.id)} />}
                >
                  View invoice
                </AppButton>
              </div>
            ) : null}

            {invoices.length > 1 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  All invoices on this rental
                </p>
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <RentalInvoiceStatusBadge status={invoice.status} />
                        {invoice.status !== "VOID" ? (
                          <PaymentStatusBadge
                            status={invoice.status}
                            balance={invoice.balance}
                            paidAmount={invoice.paidAmount}
                          />
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(invoice.invoiceDate)} ·{" "}
                        {formatCurrency(invoice.grandTotal)}
                      </p>
                    </div>
                    <AppButton
                      variant="outline"
                      size="sm"
                      leftIcon={<FileTextIcon className="size-4" aria-hidden="true" />}
                      render={<Link href={ROUTES.rentalInvoiceDetail(invoice.id)} />}
                    >
                      View invoice
                    </AppButton>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>

      <GenerateRentalInvoiceDialog
        rentalOrderId={rentalOrderId}
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />
    </section>
  );
}
