"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { RentalInvoiceLineItemsTable } from "./rental-invoice-line-items-table";
import type { RentalInvoiceResponse } from "../types";

type CustomerBillInfo = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  customerCode?: string | null;
};

type RentalInvoicePrintBillProps = {
  invoice: RentalInvoiceResponse;
  customer?: CustomerBillInfo | null;
  orderNumber?: string | null;
  className?: string;
};

export function RentalInvoicePrintBill({
  invoice,
  customer,
  orderNumber,
  className,
}: RentalInvoicePrintBillProps) {
  return (
    <div
      id="rental-invoice-print-bill"
      className={className}
    >
      <header className="space-y-4 border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Customer bill
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              Invoice date {formatDate(invoice.invoiceDate)}
              {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Grand total
            </p>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatCurrency(invoice.grandTotal)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Paid {formatCurrency(invoice.paidAmount)} · Balance{" "}
              {formatCurrency(invoice.balance)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bill to
            </p>
            <p className="font-medium">{customer?.name ?? "Customer"}</p>
            {customer?.customerCode ? (
              <p className="text-muted-foreground">{customer.customerCode}</p>
            ) : null}
            {customer?.phone ? (
              <p className="text-muted-foreground">{customer.phone}</p>
            ) : null}
            {customer?.address ? (
              <p className="text-muted-foreground">{customer.address}</p>
            ) : null}
          </div>
          <div className="space-y-1 text-sm sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rental order
            </p>
            <p className="font-medium">{orderNumber ?? invoice.rentalOrderId}</p>
            <p className="text-muted-foreground capitalize">
              Status: {invoice.status.toLowerCase().replaceAll("_", " ")}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-5">
        <RentalInvoiceLineItemsTable
          items={invoice.items}
          subtotal={invoice.subtotal}
          discount={invoice.discount}
          tax={invoice.tax}
          grandTotal={invoice.grandTotal}
        />
      </div>

      {invoice.notes ? (
        <div className="mt-5 space-y-1 border-t border-border pt-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </p>
          <p className="text-muted-foreground">{invoice.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
