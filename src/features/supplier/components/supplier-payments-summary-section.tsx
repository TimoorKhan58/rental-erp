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

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium" scope="col">
                    Number
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Date
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Method
                  </th>
                  <th className="px-3 py-2 font-medium text-right" scope="col">
                    Amount
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <Link
                        href={ROUTES.procurementDetail(payment.purchaseOrderId)}
                        className="font-medium text-primary hover:underline"
                        title="View purchase order"
                      >
                        {payment.paymentNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{formatDate(payment.paymentDate)}</td>
                    <td className="px-3 py-2">
                      {METHOD_LABELS[payment.paymentMethod]}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <PaymentRecordStatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}
