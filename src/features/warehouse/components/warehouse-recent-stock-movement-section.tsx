"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useInventoryFilterOptions } from "@/features/inventory/hooks";
import {
  useStockMovementPermissions,
  useStockMovements,
} from "@/features/stock-movement/hooks";
import { formatDateTime } from "@/lib/utils";

type WarehouseRecentStockMovementSectionProps = {
  warehouseId: string;
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  IN: "Stock in",
  OUT: "Stock out",
  RESERVE: "Reserved",
  RELEASE: "Released",
  ADJUSTMENT: "Adjusted",
};

function formatMovementType(type: string): string {
  return MOVEMENT_TYPE_LABELS[type] ?? type;
}

export function WarehouseRecentStockMovementSection({
  warehouseId,
}: WarehouseRecentStockMovementSectionProps) {
  const { canRead } = useStockMovementPermissions();
  const { productLabelById } = useInventoryFilterOptions();
  const { data, isLoading } = useStockMovements({
    warehouseId,
    pageSize: 8,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const movements = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;

  return (
    <SectionCard
      title="Recent stock movement"
      description="Latest inventory transactions recorded for this warehouse."
      actions={
        totalCount > 0 ? (
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link href={`${ROUTES.reportsInventory}?warehouseId=${warehouseId}`} />
            }
          >
            View report
          </AppButton>
        ) : null
      }
    >
      {isLoading ? (
        <LoadingState label="Loading stock movements..." />
      ) : totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No stock movements recorded for this warehouse yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium" scope="col">
                  Date
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Product
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Type
                </th>
                <th className="px-3 py-2 font-medium text-right" scope="col">
                  Qty
                </th>
                <th className="px-3 py-2 font-medium text-right" scope="col">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDateTime(movement.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={ROUTES.inventoryDetail(movement.inventoryId)}
                      className="font-medium text-primary hover:underline"
                    >
                      {productLabelById.get(movement.productId) ?? movement.productId}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{formatMovementType(movement.movementType)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {movement.newQuantity.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
