"use client";

import { cn } from "@/lib/utils";
import type { ReturnItemResponse } from "../types";

type ReturnLineItemsTableProps = {
  items: ReturnItemResponse[];
  itemLabelById: Map<string, string>;
  showInspection?: boolean;
  className?: string;
};

export function ReturnLineItemsTable({
  items,
  itemLabelById,
  showInspection = false,
  className,
}: ReturnLineItemsTableProps) {
  const totalReturned = items.reduce((sum, item) => sum + item.returnedQuantity, 0);

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border/60", className)}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium" scope="col">
              Item
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Returned
            </th>
            {showInspection ? (
              <>
                <th className="px-4 py-3 font-medium text-right" scope="col">
                  Good
                </th>
                <th className="px-4 py-3 font-medium text-right" scope="col">
                  Damaged
                </th>
                <th className="px-4 py-3 font-medium text-right" scope="col">
                  Lost
                </th>
              </>
            ) : null}
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
              <td className="px-4 py-3 font-medium">
                {itemLabelById.get(item.rentalOrderItemId) ?? item.rentalOrderItemId}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{item.returnedQuantity}</td>
              {showInspection ? (
                <>
                  <td className="px-4 py-3 text-right tabular-nums text-success">
                    {item.goodQuantity}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-warning-foreground">
                    {item.damagedQuantity}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-destructive">
                    {item.lostQuantity}
                  </td>
                </>
              ) : null}
              <td className="px-4 py-3 text-muted-foreground">{item.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/20">
            <td className="px-4 py-3 font-medium">Total returned</td>
            <td className="px-4 py-3 text-right font-heading text-base font-semibold tabular-nums">
              {totalReturned.toLocaleString()}
            </td>
            {showInspection ? <td colSpan={4} /> : <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
