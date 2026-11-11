"use client";

import Link from "next/link";
import { CreditCardIcon, PlusIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePaymentPermissions, usePayments } from "@/features/payment/hooks";
import { METHOD_LABELS } from "@/features/payment/mappers";
import { PaymentRecordStatusBadge } from "@/features/payment/components/payment-status-badge";
import { getInvoicePaymentsEmptyCopy } from "../mappers";
import type { RentalInvoiceResponse } from "../types";

type RentalInvoicePaymentsSectionProps = {
  invoice: RentalInvoiceResponse;
};

export function RentalInvoicePaymentsSection({
  invoice,
}: RentalInvoicePaymentsSectionProps) {
  const { canRead, canCreate } = usePaymentPermissions();
  const paymentsQuery = usePayments({
    rentalInvoiceId: invoice.id,
    page: 1,
    pageSize: 20,
    sortBy: "paymentDate",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const payments = paymentsQuery.data?.items ?? [];
  const totalPayments = paymentsQuery.data?.meta.total ?? payments.length;
  const canRecordPayment =
    canCreate &&
    invoice.status !== "VOID" &&
    invoice.status !== "DRAFT" &&
    invoice.balance > 0;

  return (
    <SectionCard
      title="Payment history"
      actions={
        <div className="flex flex-wrap gap-2">
          {totalPayments > payments.length ? (
            <AppButton
              variant="outline"
              size="sm"
              render={<Link href={ROUTES.paymentsForInvoice(invoice.id)} />}
            >
              View all
            </AppButton>
          ) : null}
          {canRecordPayment ? (
            <AppButton
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={
                <Link
                  href={ROUTES.paymentNewForInvoice(invoice.id, invoice.customerId)}
                />
              }
            >
              Record payment
            </AppButton>
          ) : null}
        </div>
      }
    >
      {paymentsQuery.isLoading ? (
        <LoadingState label="Loading payments..." />
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {getInvoicePaymentsEmptyCopy(invoice)}
        </p>
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
  );
}
