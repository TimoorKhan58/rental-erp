"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { MetricCard, SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { ProcurementStatusBadge } from "@/features/procurement/components/procurement-status-badge";
import {
  useProcurementPermissions,
  useProcurements,
} from "@/features/procurement/hooks";
import { formatCurrency, formatDate } from "@/lib/utils";

type WarehouseProcurementSummarySectionProps = {
  warehouseId: string;
};

export function WarehouseProcurementSummarySection({
  warehouseId,
}: WarehouseProcurementSummarySectionProps) {
  const { canRead } = useProcurementPermissions();
  const { data, isLoading } = useProcurements({
    warehouseId,
    pageSize: 100,
    sortBy: "orderDate",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const orders = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;
  const recentOrders = orders.slice(0, 5);
  const openOrders = orders.filter(
    (order) => order.status === "DRAFT" || order.status === "APPROVED" || order.status === "PARTIALLY_RECEIVED",
  ).length;
  const totalOrderValue = orders.reduce((sum, order) => sum + (order.orderTotal ?? 0), 0);
  const truncatedTotals = totalCount > orders.length;

  return (
    <SectionCard
      title="Procurement summary"
      description="Purchase orders assigned to this warehouse."
      actions={
        totalCount > 0 ? (
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link href={`${ROUTES.procurements}?warehouseId=${warehouseId}`} />
            }
          >
            View all orders
          </AppButton>
        ) : null
      }
    >
      {isLoading ? (
        <LoadingState label="Loading purchase orders..." />
      ) : totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No purchase orders recorded for this warehouse yet.
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Purchase orders" value={totalCount} />
            <MetricCard label="Open orders" value={openOrders} />
            <MetricCard
              label="Order value"
              value={formatCurrency(totalOrderValue)}
              hint={truncatedTotals ? "Based on most recent 100 orders" : undefined}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium" scope="col">
                    PO number
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Order date
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Status
                  </th>
                  <th className="px-3 py-2 font-medium text-right" scope="col">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <Link
                        href={ROUTES.procurementDetail(order.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.poNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{formatDate(order.orderDate)}</td>
                    <td className="px-3 py-2">
                      <ProcurementStatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(order.orderTotal ?? 0)}
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
