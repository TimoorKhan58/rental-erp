"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { cn, formatCurrency } from "@/lib/utils";
import {
  canIssueRentalInvoice,
  canVoidRentalInvoice,
  getInvoiceAmountRemainderLabel,
} from "../mappers";
import { PaymentStatusBadge } from "./payment-status-badge";
import { RentalInvoiceStatusBadge } from "./rental-invoice-status-badge";
import type { RentalInvoiceResponse } from "../types";

type RentalInvoiceMobileListProps = {
  rows: RentalInvoiceResponse[];
  resolveCustomerName: (customerId: string) => string;
  canIssue: boolean;
  canVoid: boolean;
  onIssue: (invoice: RentalInvoiceResponse) => void;
  onVoid: (invoice: RentalInvoiceResponse) => void;
};

export function RentalInvoiceMobileList({
  rows,
  resolveCustomerName,
  canIssue,
  canVoid,
  onIssue,
  onVoid,
}: RentalInvoiceMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Rental invoice list">
      {rows.map((row) => {
        const remainder = getInvoiceAmountRemainderLabel(row);
        const needsCollection =
          row.status !== "VOID" && row.status !== "DRAFT" && row.balance > 0;

        return (
          <li
            key={row.id}
            className={cn(
              "rounded-md border border-border bg-card px-3 py-3",
              row.status === "VOID" && "border-l-[3px] border-l-muted-foreground/40",
              needsCollection && "border-l-[3px] border-l-warning",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <Link
                  href={ROUTES.rentalInvoiceDetail(row.id)}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {row.invoiceNumber}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveCustomerName(row.customerId)}
                </p>
                <p className="tabular-nums text-sm font-medium">
                  {formatCurrency(row.grandTotal)}
                </p>
                <p
                  className={
                    needsCollection
                      ? "text-xs text-warning-foreground tabular-nums"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {remainder}
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <RentalInvoiceStatusBadge status={row.status} />
                  <PaymentStatusBadge
                    status={row.status}
                    balance={row.balance}
                    paidAmount={row.paidAmount}
                  />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.invoiceNumber}`}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={ROUTES.rentalInvoiceDetail(row.id)} />}>
                    View details
                  </DropdownMenuItem>
                  {canIssue && canIssueRentalInvoice(row.status) ? (
                    <DropdownMenuItem onClick={() => onIssue(row)}>
                      Issue invoice
                    </DropdownMenuItem>
                  ) : null}
                  {canVoid && canVoidRentalInvoice(row.status) ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onVoid(row)}>
                        Void invoice
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
