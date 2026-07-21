"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { LINE_TYPE_LABELS } from "../mappers";
import type { RentalInvoiceItemResponse } from "../types";

type RentalInvoiceLineItemsTableProps = {
  items: RentalInvoiceItemResponse[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  className?: string;
};

export function RentalInvoiceLineItemsTable({
  items,
  subtotal,
  discount,
  tax,
  grandTotal,
  className,
}: RentalInvoiceLineItemsTableProps) {
  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border/60", className)}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium" scope="col">
              Type
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Description
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Qty
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Unit price
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Line total
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => (
            <tr
              key={item.id}
              className="border-b last:border-b-0 transition-colors hover:bg-muted/20"
            >
              <td className="px-4 py-3">{LINE_TYPE_LABELS[item.lineType]}</td>
              <td className="px-4 py-3 font-medium">{item.description}</td>
              <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/20">
            <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">
              Subtotal
            </td>
            <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(subtotal)}</td>
          </tr>
          {discount > 0 ? (
            <tr className="bg-muted/20">
              <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">
                Discount
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-success">
                −{formatCurrency(discount)}
              </td>
            </tr>
          ) : null}
          {tax > 0 ? (
            <tr className="bg-muted/20">
              <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">
                Tax
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(tax)}</td>
            </tr>
          ) : null}
          <tr className="bg-muted/30">
            <td colSpan={4} className="px-4 py-3 text-right font-medium">
              Grand total
            </td>
            <td className="px-4 py-3 text-right font-heading text-base font-semibold tabular-nums">
              {formatCurrency(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
