"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppButton } from "@/components/design-system/button";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { ROUTES } from "@/config/routes";
import { useInventoryFilterOptions } from "@/features/inventory/hooks";
import {
  useStockMovementPermissions,
  useStockMovements,
} from "@/features/stock-movement/hooks";
import { StockMovementHistoryTable } from "@/features/stock-movement/components/stock-movement-history-table";
import { useReturnsByDispatch, useReturnPermissions } from "@/features/return/hooks";
import type { DispatchResponse } from "../types";

type DispatchInventoryImpactSectionProps = {
  dispatch: DispatchResponse;
  warehouseId?: string;
};

export function DispatchInventoryImpactSection({
  dispatch,
  warehouseId,
}: DispatchInventoryImpactSectionProps) {
  const { canRead } = useStockMovementPermissions();
  const { canRead: canReadReturns, canCreate: canCreateReturn } = useReturnPermissions();
  const { productLabelById } = useInventoryFilterOptions();
  const { data: movementData, isLoading: isMovementsLoading } = useStockMovements({
    warehouseId,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const { data: returnData, isLoading: isReturnsLoading } = useReturnsByDispatch(dispatch.id);

  const productIds = useMemo(
    () => new Set(dispatch.items.map((item) => item.productId)),
    [dispatch.items],
  );

  const movements = useMemo(
    () =>
      (movementData?.items ?? []).filter(
        (movement) =>
          movement.referenceId === dispatch.rentalOrderId &&
          productIds.has(movement.productId),
      ),
    [dispatch.rentalOrderId, movementData?.items, productIds],
  );

  const relatedReturns = returnData?.items ?? [];

  if (!canRead) {
    return (
      <EmptyCard
        title="Returns & inventory"
        description="You do not have permission to view stock movements."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Inventory movements"
        description="Stock reservations and outbound movements linked to this dispatch's rental order."
        actions={
          movements.length > 0 ? (
            <AppButton
              variant="outline"
              size="sm"
              render={<Link href={ROUTES.rentalOrderDetail(dispatch.rentalOrderId)} />}
            >
              View rental order
            </AppButton>
          ) : null
        }
      >
        <StockMovementHistoryTable
          movements={movements}
          isLoading={isMovementsLoading}
          productLabelById={productLabelById}
          showProductColumn
          emptyMessage={
            dispatch.status === "COMPLETED" || dispatch.status === "DISPATCHED"
              ? "No stock movements found for this dispatch yet."
              : "Inventory movements will appear after dispatch is completed."
          }
        />
      </SectionCard>

      <SectionCard
        title="Related returns"
        description="Return records linked to this dispatch."
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreateReturn && dispatch.status === "COMPLETED" ? (
              <AppButton
                size="sm"
                render={
                  <Link
                    href={`${ROUTES.returnsNew}?dispatchId=${dispatch.id}&rentalOrderId=${dispatch.rentalOrderId}`}
                  />
                }
              >
                Create return
              </AppButton>
            ) : null}
            {relatedReturns.length > 0 && canReadReturns ? (
              <AppButton
                variant="outline"
                size="sm"
                render={<Link href={`${ROUTES.returns}?dispatchId=${dispatch.id}`} />}
              >
                View returns
              </AppButton>
            ) : null}
          </div>
        }
      >
        {isReturnsLoading ? (
          <p className="text-sm text-muted-foreground">Loading returns...</p>
        ) : relatedReturns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No return records linked to this dispatch yet.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {relatedReturns.map((record) => (
              <li key={record.id}>
                <Link href={ROUTES.returnDetail(record.id)} className="text-primary hover:underline">
                  {record.returnNumber}
                </Link>
                <span className="ml-2 text-muted-foreground">
                  {record.status.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
