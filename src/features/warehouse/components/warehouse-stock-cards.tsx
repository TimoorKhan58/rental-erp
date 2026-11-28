"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import {
  useFinancialReportPermissions,
  useWarehouseReport,
} from "@/features/financial-report/hooks";
import type { WarehouseReportLine } from "@/features/financial-report/types";

/** How much of a warehouse's stock is out on orders, as a share of what it keeps. */
export function bookedShare(line: Pick<WarehouseReportLine, "inventoryQuantity" | "reservedQuantity">): number {
  if (line.inventoryQuantity <= 0) return 0;
  return Math.min(100, Math.round((line.reservedQuantity / line.inventoryQuantity) * 100));
}

export function WarehouseStockCardsView({ lines }: { lines: WarehouseReportLine[] }) {
  if (lines.length === 0) return null;
  return (
    <section aria-label="Stock at each warehouse" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {lines.map((line) => {
        const share = bookedShare(line);
        return (
          <Link
            key={line.warehouseId}
            href={ROUTES.warehouseDetail(line.warehouseId)}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/40"
          >
            <div>
              <p className="truncate text-sm font-medium">{line.warehouseName}</p>
              <p className="text-xs text-muted-foreground">
                {line.productCount.toLocaleString()} {line.productCount === 1 ? "item" : "items"} kept
              </p>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {line.availableQuantity.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">free to rent now</p>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                {line.inventoryQuantity.toLocaleString()} in stock
                <br />
                {line.reservedQuantity.toLocaleString()} booked
              </p>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${share}% of this stock is booked`}
            >
              <div
                className={cn("h-full rounded-full", share >= 85 ? "bg-warning" : "bg-primary")}
                style={{ width: `${share}%` }}
              />
            </div>
          </Link>
        );
      })}
    </section>
  );
}

/** One card per warehouse: free now, in stock, booked. Only for people who may read reports. */
export function WarehouseStockCards() {
  const { canReadOperational } = useFinancialReportPermissions();
  const { data } = useWarehouseReport({ page: 1, pageSize: 50 });
  if (!canReadOperational || !data) return null;
  return <WarehouseStockCardsView lines={data.lines} />;
}
