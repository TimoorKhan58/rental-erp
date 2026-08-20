"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { MetricCard, SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { ReturnStatusBadge } from "./return-status-badge";
import { useReturnPermissions, useReturns } from "../hooks";
import { getReturnTotalQuantity } from "../mappers";

type RentalOrderReturnsSectionProps = {
  rentalOrderId: string;
  orderStatus: string;
};

const RETURN_ELIGIBLE_STATUSES = new Set(["ON_RENT", "RETURN_PENDING", "PARTIALLY_RETURNED"]);

export function RentalOrderReturnsSection({
  rentalOrderId,
  orderStatus,
}: RentalOrderReturnsSectionProps) {
  const { canRead, canCreate } = useReturnPermissions();
  const { data, isLoading } = useReturns({
    rentalOrderId,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const returns = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;
  const recentReturns = returns.slice(0, 5);
  const openReturns = returns.filter(
    (record) =>
      record.status === "DRAFT" ||
      record.status === "RECEIVED" ||
      record.status === "INSPECTED",
  ).length;
  const completedReturns = returns.filter((record) => record.status === "COMPLETED").length;
  const totalUnits = returns.reduce(
    (sum, record) => sum + getReturnTotalQuantity(record),
    0,
  );
  const canCreateReturn = canCreate && RETURN_ELIGIBLE_STATUSES.has(orderStatus);

  return (
    <SectionCard
      title="Returns"
      description="Return inspections linked to this rental order."
      actions={
        <div className="flex flex-wrap gap-2">
          {canCreateReturn ? (
            <AppButton
              size="sm"
              render={<Link href={`${ROUTES.returnsNew}?rentalOrderId=${rentalOrderId}`} />}
            >
              Create return
            </AppButton>
          ) : null}
          {totalCount > 0 ? (
            <AppButton
              variant="outline"
              size="sm"
              render={<Link href={`${ROUTES.returns}?rentalOrderId=${rentalOrderId}`} />}
            >
              View all returns
            </AppButton>
          ) : null}
        </div>
      }
    >
      {isLoading ? (
        <LoadingState label="Loading returns..." />
      ) : totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canCreateReturn
            ? "No returns recorded for this order yet. Create one when assets are received back."
            : "No returns recorded for this order yet."}
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Returns" value={totalCount} />
            <MetricCard label="Open returns" value={openReturns} />
            <MetricCard
              label="Units returned"
              value={totalUnits.toLocaleString()}
              hint={totalCount > returns.length ? "Based on most recent 100 returns" : undefined}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium" scope="col">
                    Return
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Return date
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Status
                  </th>
                  <th className="px-3 py-2 font-medium text-right" scope="col">
                    Units
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentReturns.map((record) => (
                  <tr key={record.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <Link
                        href={ROUTES.returnDetail(record.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {record.returnNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{formatDate(record.returnDate)}</td>
                    <td className="px-3 py-2">
                      <ReturnStatusBadge status={record.status} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {getReturnTotalQuantity(record).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {completedReturns > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {completedReturns} completed return{completedReturns === 1 ? "" : "s"} on this order.
            </p>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
