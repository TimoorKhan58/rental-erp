"use client";

import { cn } from "@/lib/utils";
import type { DispatchItemResponse } from "../types";

type DispatchLineItemsTableProps = {
  items: DispatchItemResponse[];
  productLabelById: Map<string, string>;
  productNameById?: Map<string, string>;
  className?: string;
};

export function DispatchLineItemsTable({
  items,
  productLabelById,
  productNameById,
  className,
}: DispatchLineItemsTableProps) {
  const resolveProductName = (productId: string) =>
    productNameById?.get(productId) ?? productLabelById.get(productId) ?? productId;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border/60", className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium" scope="col">
              Product
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Quantity
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Notes
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b last:border-b-0 transition-colors hover:bg-muted/20"
            >
              <td className="px-4 py-3 font-medium">{resolveProductName(item.productId)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/20">
            <td className="px-4 py-3 font-medium">Total units</td>
            <td className="px-4 py-3 text-right font-heading text-base font-semibold tabular-nums">
              {totalQuantity.toLocaleString()}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
