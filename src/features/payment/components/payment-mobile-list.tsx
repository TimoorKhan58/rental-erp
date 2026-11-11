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
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  canEditPayment,
  canPostPayment,
  canVoidPayment,
  METHOD_LABELS,
} from "../mappers";
import { PaymentRecordStatusBadge } from "./payment-status-badge";
import type { PaymentResponse } from "../types";

type PaymentMobileListProps = {
  rows: PaymentResponse[];
  resolveCustomerName: (customerId: string) => string;
  resolveInvoiceLabel: (invoiceId: string) => string;
  canUpdate: boolean;
  canPost: boolean;
  canVoid: boolean;
  onPost: (payment: PaymentResponse) => void;
  onVoid: (payment: PaymentResponse) => void;
};

export function PaymentMobileList({
  rows,
  resolveCustomerName,
  resolveInvoiceLabel,
  canUpdate,
  canPost,
  canVoid,
  onPost,
  onVoid,
}: PaymentMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Payment list">
      {rows.map((row) => {
        const showEdit = canUpdate && canEditPayment(row.status);
        const showPost = canPost && canPostPayment(row.status);
        const showVoid = canVoid && canVoidPayment(row.status);

        return (
          <li
            key={row.id}
            className={cn(
              "rounded-md border border-border bg-card px-3 py-3",
              row.status === "VOID" && "border-l-[3px] border-l-muted-foreground/40",
              row.status === "PENDING" && "border-l-[3px] border-l-warning",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <Link
                  href={ROUTES.paymentDetail(row.id)}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {row.paymentNumber}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveCustomerName(row.customerId)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveInvoiceLabel(row.rentalInvoiceId)}
                </p>
                <p className="tabular-nums text-sm font-medium">
                  {formatCurrency(row.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {METHOD_LABELS[row.paymentMethod]} · {formatDate(row.paymentDate)}
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <PaymentRecordStatusBadge status={row.status} />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.paymentNumber}`}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={ROUTES.paymentDetail(row.id)} />}>
                    View details
                  </DropdownMenuItem>
                  {showEdit ? (
                    <DropdownMenuItem render={<Link href={ROUTES.paymentEdit(row.id)} />}>
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {showPost ? (
                    <DropdownMenuItem onClick={() => onPost(row)}>Post payment</DropdownMenuItem>
                  ) : null}
                  {showVoid ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onVoid(row)}>
                        Void payment
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
