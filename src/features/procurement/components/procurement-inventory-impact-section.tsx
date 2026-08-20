"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppButton } from "@/components/design-system/button";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useInventoryFilterOptions } from "@/features/inventory/hooks";
import {
  useStockMovementPermissions,
  useStockMovements,
} from "@/features/stock-movement/hooks";
import { StockMovementHistoryTable } from "@/features/stock-movement/components/stock-movement-history-table";
import type { ProcurementResponse } from "../types";

type ProcurementInventoryImpactSectionProps = {
  procurement: ProcurementResponse;
};

export function ProcurementInventoryImpactSection({
  procurement,
}: ProcurementInventoryImpactSectionProps) {
  const { canRead } = useStockMovementPermissions();
  const { productLabelById } = useInventoryFilterOptions();
  const { data, isLoading } = useStockMovements({
    warehouseId: procurement.warehouseId,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const movements = useMemo(() => {
    const productIds = new Set(procurement.items.map((item) => item.productId));

    return (data?.items ?? []).filter(
      (movement) =>
        movement.referenceId === procurement.id && productIds.has(movement.productId),
    );
  }, [data?.items, procurement.id, procurement.items]);

  if (!canRead) {
    return (
      <EmptyCard
        title="Inventory impact"
        description="You do not have permission to view stock movements."
      />
    );
  }

  return (
    <SectionCard
      title="Inventory impact"
      description="Stock-in movements recorded when this purchase order was received."
      actions={
        movements.length > 0 ? (
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link href={`${ROUTES.inventory}?search=${encodeURIComponent(procurement.poNumber)}`} />
            }
          >
            View inventory
          </AppButton>
        ) : null
      }
    >
      <StockMovementHistoryTable
        movements={movements}
        isLoading={isLoading}
        productLabelById={productLabelById}
        showProductColumn
        emptyMessage={
          procurement.status === "RECEIVED" || procurement.status === "PARTIALLY_RECEIVED"
            ? "No stock movements found for this purchase order yet."
            : "Inventory impact will appear after items are received."
        }
      />
    </SectionCard>
  );
}
