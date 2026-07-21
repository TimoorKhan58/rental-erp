"use client";

import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { METHOD_LABELS } from "../mappers";
import type { PaymentResponse } from "../types";

type PaymentDetailsTableProps = {
  payment: PaymentResponse;
  customerLabel: string;
  invoiceLabel: string;
  className?: string;
};

export function PaymentDetailsTable({
  payment,
  customerLabel,
  invoiceLabel,
  className,
}: PaymentDetailsTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border/60", className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium" scope="col">
              Customer
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Invoice
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Method
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Payment date
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Amount
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Reference
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="transition-colors hover:bg-muted/20">
            <td className="px-4 py-3 font-medium">{customerLabel}</td>
            <td className="px-4 py-3">{invoiceLabel}</td>
            <td className="px-4 py-3">{METHOD_LABELS[payment.paymentMethod]}</td>
            <td className="px-4 py-3">{formatDate(payment.paymentDate)}</td>
            <td className="px-4 py-3 text-right tabular-nums font-medium">
              {formatCurrency(payment.amount)}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {payment.referenceNumber ?? "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
