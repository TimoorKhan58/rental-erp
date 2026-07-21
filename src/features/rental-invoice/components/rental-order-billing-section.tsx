"use client";

import Link from "next/link";
import { FileTextIcon, ReceiptIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useGenerateRentalInvoiceFromOrder,
  useRentalInvoicePermissions,
  useRentalInvoices,
} from "../hooks";
import { RentalInvoiceStatusBadge } from "./rental-invoice-status-badge";

type RentalOrderBillingSectionProps = {
  rentalOrderId: string;
  canGenerate?: boolean;
};

export function RentalOrderBillingSection({
  rentalOrderId,
  canGenerate = true,
}: RentalOrderBillingSectionProps) {
  const { canCreate, canRead } = useRentalInvoicePermissions();
  const generateInvoice = useGenerateRentalInvoiceFromOrder();
  const invoicesQuery = useRentalInvoices({
    rentalOrderId,
    page: 1,
    pageSize: 10,
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const invoices = invoicesQuery.data?.items ?? [];
  const activeInvoice = invoices.find((invoice) => invoice.status !== "VOID");
  const showGenerate =
    canGenerate && canCreate && activeInvoice === undefined && !generateInvoice.isPending;

  return (
    <SectionCard
      title="Customer invoice"
      actions={
        showGenerate ? (
          <AppButton
            size="sm"
            leftIcon={<ReceiptIcon className="size-4" aria-hidden="true" />}
            onClick={() => generateInvoice.mutate(rentalOrderId)}
            disabled={generateInvoice.isPending}
          >
            Generate invoice
          </AppButton>
        ) : null
      }
    >
      {invoicesQuery.isLoading ? (
        <LoadingState label="Loading invoices..." />
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No customer invoice yet. Generate one after the return is completed to bill rental
          charges, damage, and lost items.
        </p>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <RentalInvoiceStatusBadge status={invoice.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(invoice.invoiceDate)} · {formatCurrency(invoice.grandTotal)}
                  {invoice.balance > 0 ? ` · ${formatCurrency(invoice.balance)} due` : " · Paid"}
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
      )}
    </SectionCard>
  );
}
