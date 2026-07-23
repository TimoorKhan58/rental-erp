"use client";

import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  calculateLineSubtotal,
  getRemainingReserveQuantity,
} from "../mappers";
import { RentalOrderReservationProgressBar } from "./rental-order-reservation-progress-bar";
import type { RentalOrderItemResponse } from "../types";

type RentalOrderLineItemsTableProps = {
  items: RentalOrderItemResponse[];
  productLabelById: Map<string, string>;
  productNameById?: Map<string, string>;
  className?: string;
};

export function RentalOrderLineItemsTable({
  items,
  productLabelById,
  productNameById,
  className,
}: RentalOrderLineItemsTableProps) {
  const resolveProductName = (productId: string) =>
    productNameById?.get(productId) ?? productLabelById.get(productId) ?? productId;

  const orderTotal = items.reduce(
    (sum, item) => sum + calculateLineSubtotal(item),
    0,
  );

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border/60", className)}>
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium" scope="col">
              Product
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Rental period
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Reservation
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Qty
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Daily rate
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const subtotal = calculateLineSubtotal(item);
            const remaining = getRemainingReserveQuantity(item);

            return (
              <tr
                key={item.id}
                className="border-b last:border-b-0 transition-colors hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{resolveProductName(item.productId)}</p>
                  {remaining > 0 ? (
                    <p className="text-xs text-warning-foreground">
                      {remaining.toLocaleString()} remaining to reserve
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {item.numberOfDays} day{item.numberOfDays === 1 ? "" : "s"}
                  </p>
                  <p>
                    {formatDate(item.startDate)} – {formatDate(item.endDate)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-[8rem] space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                      <span className="font-medium">{item.reservedQuantity}</span>
                      <span className="text-muted-foreground">/ {item.quantity}</span>
                    </div>
                    <RentalOrderReservationProgressBar
                      reserved={item.reservedQuantity}
                      total={item.quantity}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(item.dailyRate)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatCurrency(subtotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/20">
            <td colSpan={5} className="px-4 py-3 text-right font-medium">
              Order total
            </td>
            <td className="px-4 py-3 text-right font-heading text-base font-semibold tabular-nums">
              {formatCurrency(orderTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
