"use client";

import Link from "next/link";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { PaymentRecordStatusBadge } from "@/features/payment/components";
import { METHOD_LABELS } from "@/features/payment/mappers";
import {
  useSupplierPaymentPermissions,
  useSupplierPayments,
} from "@/features/procurement/hooks";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";

type SupplierPaymentsSummarySectionProps = {
  supplierId: string;
};

export function SupplierPaymentsSummarySection({
  supplierId,
}: SupplierPaymentsSummarySectionProps) {
  const { canRead } = useSupplierPaymentPermissions();
  const { data, isLoading } = useSupplierPayments({
    supplierId,
    pageSize: 10,
    sortBy: "paymentDate",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const payments = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <SectionCard
      title="Supplier payments"
      description="Recent payments recorded against this supplier's purchase orders."
    >
      {isLoading ? (
        <LoadingState label="Loading supplier payments..." />
      ) : totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No supplier payments recorded yet.
        </p>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent payments
              </dt>
              <dd className="text-sm font-medium">{totalCount}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Amount shown
              </dt>
              <dd className="text-sm font-medium">{formatCurrency(totalAmount)}</dd>
            </div>
          </dl>

          {/* A list, not a table: the side column is too narrow for five columns. */}
          <ul className="divide-y divide-border rounded-xl border">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link
                    href={ROUTES.procurementDetail(payment.purchaseOrderId)}
                    className="font-medium text-primary hover:underline"
                    title="View purchase order"
                  >
                    {payment.paymentNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(payment.paymentDate)} · {METHOD_LABELS[payment.paymentMethod]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-medium tabular-nums">{formatCurrency(payment.amount)}</span>
                  {payment.status !== "POSTED" ? <PaymentRecordStatusBadge status={payment.status} /> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
