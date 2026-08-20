"use client";

import Link from "next/link";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { formatDateTime } from "@/lib/utils";
import type { StockMovementResponse } from "../types/stock-movement.types";
import {
  formatMovementType,
  formatReferenceType,
  resolveReferenceHref,
} from "../mappers/stock-movement-display.mapper";

type StockMovementHistoryTableProps = {
  movements: StockMovementResponse[];
  isLoading?: boolean;
  emptyMessage?: string;
  productLabelById?: Map<string, string>;
  showProductColumn?: boolean;
};

export function StockMovementHistoryTable({
  movements,
  isLoading = false,
  emptyMessage = "No stock movements recorded yet.",
  productLabelById,
  showProductColumn = false,
}: StockMovementHistoryTableProps) {
  if (isLoading) {
    return <LoadingState label="Loading stock movements..." />;
  }

  if (movements.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium" scope="col">
              Date
            </th>
            {showProductColumn ? (
              <th className="px-3 py-2 font-medium" scope="col">
                Product
              </th>
            ) : null}
            <th className="px-3 py-2 font-medium" scope="col">
              Type
            </th>
            <th className="px-3 py-2 font-medium" scope="col">
              Reference
            </th>
            <th className="px-3 py-2 font-medium text-right" scope="col">
              Qty
            </th>
            <th className="px-3 py-2 font-medium text-right" scope="col">
              Balance
            </th>
            <th className="px-3 py-2 font-medium" scope="col">
              Remarks
            </th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => {
            const referenceHref = resolveReferenceHref(
              movement.referenceType,
              movement.referenceId,
            );

            return (
              <tr key={movement.id} className="border-b last:border-b-0">
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDateTime(movement.createdAt)}
                </td>
                {showProductColumn ? (
                  <td className="px-3 py-2">
                    {productLabelById?.get(movement.productId) ?? movement.productId}
                  </td>
                ) : null}
                <td className="px-3 py-2">{formatMovementType(movement.movementType)}</td>
                <td className="px-3 py-2">
                  {referenceHref ? (
                    <Link href={referenceHref} className="text-primary hover:underline">
                      {formatReferenceType(movement.referenceType)}
                    </Link>
                  ) : (
                    formatReferenceType(movement.referenceType)
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {movement.quantity > 0 ? "+" : ""}
                  {movement.quantity.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {movement.newQuantity.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {movement.remarks?.trim() ? movement.remarks : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type StockMovementHistorySectionProps = StockMovementHistoryTableProps & {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
};

export function StockMovementHistorySection({
  title = "Stock movement history",
  description,
  actions,
  ...tableProps
}: StockMovementHistorySectionProps) {
  return (
    <SectionCard title={title} description={description} actions={actions}>
      <StockMovementHistoryTable {...tableProps} />
    </SectionCard>
  );
}
