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

function isRentalProductLine(item: RentalInvoiceItemResponse): boolean {
  return (
    item.lineType === "RENTAL_CHARGE" &&
    Boolean(item.productName || item.numberOfDays != null || item.dailyRate != null)
  );
}

function lineTypeLabel(item: RentalInvoiceItemResponse): string {
  if (item.lineType === "MANUAL_CHARGE" && item.missingQuantity > 0) {
    return "Missing (no charge)";
  }

  return LINE_TYPE_LABELS[item.lineType] ?? item.lineType;
}

function quantityLabel(item: RentalInvoiceItemResponse): string {
  if (isRentalProductLine(item)) {
    const days = item.numberOfDays != null ? ` · ${item.numberOfDays} day(s)` : "";
    return `${item.quantity}${days}`;
  }

  return String(item.quantity);
}

function unitPriceLabel(item: RentalInvoiceItemResponse): string {
  if (isRentalProductLine(item)) {
    return `${formatCurrency(item.dailyRate ?? item.unitPrice)} / day`;
  }

  if (item.lineType === "MANUAL_CHARGE" && item.missingQuantity > 0) {
    return "No charge";
  }

  return formatCurrency(item.unitPrice);
}

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
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium" scope="col">
              Charge
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Details
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Qty
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Unit price
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const isMissing =
              item.lineType === "MANUAL_CHARGE" && item.missingQuantity > 0;
            const isConditionCharge =
              item.lineType === "DAMAGE_CHARGE" ||
              item.lineType === "LOST_ITEM_CHARGE" ||
              isMissing;

            return (
              <tr
                key={item.id}
                className={cn(
                  "border-b last:border-b-0 transition-colors hover:bg-muted/20",
                  isConditionCharge && "bg-muted/10",
                )}
              >
                <td className="px-4 py-3 align-top">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {lineTypeLabel(item)}
                  </p>
                  <p className="font-medium">{item.description}</p>
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  {item.notes?.trim() ? item.notes : "—"}
                </td>
                <td className="px-4 py-3 align-top text-right tabular-nums">
                  {quantityLabel(item)}
                </td>
                <td className="px-4 py-3 align-top text-right tabular-nums">
                  {unitPriceLabel(item)}
                </td>
                <td className="px-4 py-3 align-top text-right tabular-nums font-medium">
                  {isMissing ? "—" : formatCurrency(item.lineTotal)}
                </td>
              </tr>
            );
          })}
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
