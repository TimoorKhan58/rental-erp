"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { MetricCard, SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { DispatchStatusBadge } from "./dispatch-status-badge";
import { useDispatchPermissions, useDispatches } from "../hooks";
import { getDispatchTotalQuantity } from "../mappers";

type RentalOrderDispatchesSectionProps = {
  rentalOrderId: string;
  orderStatus: string;
};

const DISPATCH_ELIGIBLE_STATUSES = new Set(["CONFIRMED", "RESERVED", "ON_RENT"]);

export function RentalOrderDispatchesSection({
  rentalOrderId,
  orderStatus,
}: RentalOrderDispatchesSectionProps) {
  const { canRead, canCreate } = useDispatchPermissions();
  const { data, isLoading } = useDispatches({
    rentalOrderId,
    pageSize: 100,
    sortBy: "dispatchDate",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const dispatches = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;
  const recentDispatches = dispatches.slice(0, 5);
  const openDispatches = dispatches.filter(
    (dispatch) =>
      dispatch.status === "DRAFT" ||
      dispatch.status === "READY" ||
      dispatch.status === "DISPATCHED",
  ).length;
  const completedDispatches = dispatches.filter(
    (dispatch) => dispatch.status === "COMPLETED",
  ).length;
  const totalUnits = dispatches.reduce(
    (sum, dispatch) => sum + getDispatchTotalQuantity(dispatch),
    0,
  );
  const canCreateDispatch = canCreate && DISPATCH_ELIGIBLE_STATUSES.has(orderStatus);

  return (
    <SectionCard
      title="Dispatches"
      description="Dispatch records linked to this rental order."
      actions={
        <div className="flex flex-wrap gap-2">
          {canCreateDispatch ? (
            <AppButton
              size="sm"
              render={
                <Link href={`${ROUTES.dispatchesNew}?rentalOrderId=${rentalOrderId}`} />
              }
            >
              Create dispatch
            </AppButton>
          ) : null}
          {totalCount > 0 ? (
            <AppButton
              variant="outline"
              size="sm"
              render={
                <Link href={`${ROUTES.dispatches}?rentalOrderId=${rentalOrderId}`} />
              }
            >
              View all dispatches
            </AppButton>
          ) : null}
        </div>
      }
    >
      {isLoading ? (
        <LoadingState label="Loading dispatches..." />
      ) : totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canCreateDispatch
            ? "No dispatches recorded for this order yet. Create one when stock is ready to leave."
            : "No dispatches recorded for this order yet."}
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Dispatches" value={totalCount} />
            <MetricCard label="Open dispatches" value={openDispatches} />
            <MetricCard
              label="Units on these records"
              value={totalUnits.toLocaleString()}
              hint={
                totalCount > dispatches.length ? "Based on the most recent 100 dispatches" : undefined
              }
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium" scope="col">
                    Dispatch
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Dispatch date
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
                {recentDispatches.map((dispatch) => (
                  <tr key={dispatch.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <Link
                        href={ROUTES.dispatchDetail(dispatch.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {dispatch.dispatchNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{formatDate(dispatch.dispatchDate)}</td>
                    <td className="px-3 py-2">
                      <DispatchStatusBadge status={dispatch.status} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {getDispatchTotalQuantity(dispatch).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {completedDispatches > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {completedDispatches} completed dispatch
              {completedDispatches === 1 ? "" : "es"} on this order.
            </p>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
