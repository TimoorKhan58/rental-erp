"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { MetricCard, SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import {
  useFinancialReportPermissions,
  useWarehouseReport,
} from "@/features/financial-report/hooks";
import {
  useInventoryFilterOptions,
  useInventoryList,
  useInventoryPermissions,
} from "@/features/inventory/hooks";
import { InventoryStockStatusBadge } from "@/features/inventory/components/inventory-stock-status-badge";
import { deriveStockStatus } from "@/features/inventory/mappers/inventory-stock.mapper";
import { formatCurrency } from "@/lib/utils";

type WarehouseInventorySummarySectionProps = {
  warehouseId: string;
};

export function WarehouseInventorySummarySection({
  warehouseId,
}: WarehouseInventorySummarySectionProps) {
  const { canRead: canReadInventory } = useInventoryPermissions();
  const { canRead: canReadReports } = useFinancialReportPermissions();
  const { productLabelById } = useInventoryFilterOptions();

  const inventory = useInventoryList({
    warehouseId,
    pageSize: 100,
    sortBy: "quantityOnHand",
    sortOrder: "desc",
  });

  const report = useWarehouseReport({
    warehouseId,
    pageSize: 1,
  });

  if (!canReadInventory && !canReadReports) {
    return null;
  }

  const items = inventory.data?.items ?? [];
  const totalRecords = inventory.data?.meta.total ?? 0;
  const recentItems = items.slice(0, 5);
  const reportLine = report.data?.lines.find((line) => line.warehouseId === warehouseId);
  const truncatedTotals = totalRecords > items.length;
  const isLoading =
    (canReadInventory && inventory.isLoading) || (canReadReports && report.isLoading);

  return (
    <SectionCard
      title="Inventory summary"
      description="Stock levels and product assignments for this warehouse."
      actions={
        canReadInventory && totalRecords > 0 ? (
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link href={`${ROUTES.inventory}?warehouseId=${warehouseId}`} />
            }
          >
            View all stock
          </AppButton>
        ) : null
      }
    >
      {isLoading ? (
        <LoadingState label="Loading inventory..." />
      ) : totalRecords === 0 && !reportLine ? (
        <p className="text-sm text-muted-foreground">
          No inventory records assigned to this warehouse yet.
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Products"
              value={reportLine?.productCount ?? totalRecords}
            />
            <MetricCard
              label="On hand"
              value={(reportLine?.inventoryQuantity ?? 0).toLocaleString()}
            />
            <MetricCard
              label="Available"
              value={(reportLine?.availableQuantity ?? 0).toLocaleString()}
            />
            <MetricCard
              label="Inventory value"
              value={formatCurrency(reportLine?.inventoryValue ?? 0)}
              hint={
                truncatedTotals && !reportLine
                  ? "Based on most recent 100 records"
                  : undefined
              }
            />
          </div>

          {canReadInventory && recentItems.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium" scope="col">
                      Product
                    </th>
                    <th className="px-3 py-2 font-medium text-right" scope="col">
                      On hand
                    </th>
                    <th className="px-3 py-2 font-medium text-right" scope="col">
                      Available
                    </th>
                    <th className="px-3 py-2 font-medium" scope="col">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <Link
                          href={ROUTES.inventoryDetail(item.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {productLabelById.get(item.productId) ?? item.productId}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.quantityOnHand.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.availableQuantity.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <InventoryStockStatusBadge status={deriveStockStatus(item)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
