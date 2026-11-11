"use client";

import Link from "next/link";
import { CreditCardIcon, PlusIcon, ReceiptIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRentalInvoices } from "@/features/rental-invoice/hooks";
import { RentalInvoiceStatusBadge } from "@/features/rental-invoice/components/rental-invoice-status-badge";
import { PaymentRecordStatusBadge } from "@/features/payment/components";
import { usePaymentPermissions, usePayments } from "@/features/payment/hooks";
import { METHOD_LABELS } from "@/features/payment/mappers";

type CustomerBillingSectionProps = {
  customerId: string;
};

export function CustomerBillingSection({ customerId }: CustomerBillingSectionProps) {
  const { canRead, canCreate } = usePaymentPermissions();
  const paymentsQuery = usePayments({
    customerId,
    page: 1,
    pageSize: 5,
    sortBy: "paymentDate",
    sortOrder: "desc",
  });
  const invoicesQuery = useRentalInvoices({
    customerId,
    page: 1,
    pageSize: 10,
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const payments = paymentsQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const outstandingInvoices = invoices.filter(
    (invoice) => invoice.status !== "VOID" && invoice.balance > 0,
  );
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, invoice) => sum + invoice.balance,
    0,
  );
  const payableInvoice = outstandingInvoices.find(
    (invoice) => invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID",
  );

  return (
    <>
      <SectionCard
        title="Billing summary"
        description="Outstanding amounts use each invoice’s API balance from recent invoices loaded here — not a separate customer ledger balance."
        actions={
          canCreate && payableInvoice ? (
            <AppButton
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={
                <Link
                  href={ROUTES.paymentNewForInvoice(
                    payableInvoice.id,
                    customerId,
                  )}
                />
              }
            >
              Record payment
            </AppButton>
          ) : null
        }
      >
        {invoicesQuery.isLoading ? (
          <LoadingState label="Loading billing summary..." />
        ) : (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/15 px-3 py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Outstanding
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {formatCurrency(totalOutstanding)}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-muted/15 px-3 py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Open invoices
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {outstandingInvoices.length}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-muted/15 px-3 py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent payments
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {paymentsQuery.data?.meta.total ?? payments.length}
              </dd>
            </div>
          </dl>
        )}
      </SectionCard>

      <SectionCard
        title="Outstanding invoices"
        actions={
          outstandingInvoices.length > 0 ? (
            <AppButton
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`${ROUTES.rentalInvoices}?customerId=${customerId}&paymentStatus=unpaid`}
                />
              }
            >
              View all
            </AppButton>
          ) : null
        }
      >
        {invoicesQuery.isLoading ? (
          <LoadingState label="Loading invoices..." />
        ) : outstandingInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outstanding rental invoices for this customer.
          </p>
        ) : (
          <div className="space-y-3">
            {outstandingInvoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <RentalInvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(invoice.invoiceDate)} · {formatCurrency(invoice.balance)} due
                  </p>
                </div>
                <AppButton
                  variant="outline"
                  size="sm"
                  leftIcon={<ReceiptIcon className="size-4" aria-hidden="true" />}
                  render={<Link href={ROUTES.rentalInvoiceDetail(invoice.id)} />}
                >
                  View invoice
                </AppButton>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Recent payments"
        actions={
          (paymentsQuery.data?.meta.total ?? 0) > 0 ? (
            <AppButton
              variant="outline"
              size="sm"
              render={<Link href={ROUTES.paymentsForCustomer(customerId)} />}
            >
              View all
            </AppButton>
          ) : null
        }
      >
        {paymentsQuery.isLoading ? (
          <LoadingState label="Loading payments..." />
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{payment.paymentNumber}</p>
                    <PaymentRecordStatusBadge status={payment.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(payment.paymentDate)} · {formatCurrency(payment.amount)} ·{" "}
                    {METHOD_LABELS[payment.paymentMethod]}
                  </p>
                </div>
                <AppButton
                  variant="outline"
                  size="sm"
                  leftIcon={<CreditCardIcon className="size-4" aria-hidden="true" />}
                  render={<Link href={ROUTES.paymentDetail(payment.id)} />}
                >
                  View payment
                </AppButton>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
