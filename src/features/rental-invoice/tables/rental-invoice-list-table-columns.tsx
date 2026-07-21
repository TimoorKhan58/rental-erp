"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import type { DataTableColumn } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { canIssueRentalInvoice, canVoidRentalInvoice } from "../mappers";
import { PaymentStatusBadge } from "../components/payment-status-badge";
import { RentalInvoiceStatusBadge } from "../components/rental-invoice-status-badge";
import { RentalInvoicePaymentProgressBar } from "../components/rental-invoice-payment-progress-bar";
import { RentalInvoiceWorkflowProgressBar } from "../components/rental-invoice-workflow-progress-bar";
import { SortableColumnHeader } from "./sortable-column-header";
import type {
  ListRentalInvoicesParams,
  RentalInvoiceResponse,
  RentalInvoiceSortField,
} from "../types";

type RentalInvoiceTableColumnOptions = {
  params: ListRentalInvoicesParams;
  onSort: (field: RentalInvoiceSortField, order: ListRentalInvoicesParams["sortOrder"]) => void;
  customerLabelById: Map<string, string>;
  rentalOrderLabelById: Map<string, string>;
  canIssue: boolean;
  canVoid: boolean;
  onIssue: (invoice: RentalInvoiceResponse) => void;
  onVoid: (invoice: RentalInvoiceResponse) => void;
};

export function getRentalInvoiceTableColumns({
  params,
  onSort,
  customerLabelById,
  rentalOrderLabelById,
  canIssue,
  canVoid,
  onIssue,
  onVoid,
}: RentalInvoiceTableColumnOptions): Array<DataTableColumn<RentalInvoiceResponse>> {
  return [
    {
      id: "invoiceNumber",
      header: (
        <SortableColumnHeader
          label="Invoice"
          field="invoiceNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link href={ROUTES.rentalInvoiceDetail(row.id)} className="group block min-w-[8rem]">
          <span className="font-medium text-primary group-hover:underline">
            {row.invoiceNumber}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {customerLabelById.get(row.customerId) ?? row.customerId}
          </span>
        </Link>
      ),
    },
    {
      id: "rentalOrder",
      header: "Rental order",
      cell: (row) => (
        <span className="text-sm">
          {rentalOrderLabelById.get(row.rentalOrderId) ?? row.rentalOrderId}
        </span>
      ),
    },
    {
      id: "workflow",
      header: "Progress",
      cell: (row) => (
        <div className="min-w-[8rem] space-y-1.5">
          <RentalInvoiceStatusBadge status={row.status} />
          <RentalInvoiceWorkflowProgressBar status={row.status} />
        </div>
      ),
    },
    {
      id: "invoiceDate",
      header: (
        <SortableColumnHeader
          label="Invoice date"
          field="invoiceDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <div className="min-w-[6rem] text-sm">
          <p className="font-medium">{formatDate(row.invoiceDate)}</p>
          <p className="text-xs text-muted-foreground">
            Due {row.dueDate ? formatDate(row.dueDate) : "—"}
          </p>
        </div>
      ),
    },
    {
      id: "amount",
      header: (
        <SortableColumnHeader
          label="Amount"
          field="grandTotal"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <div className="min-w-[6rem] text-sm">
          <p className="font-medium tabular-nums">{formatCurrency(row.grandTotal)}</p>
          {row.balance > 0 && row.status !== "VOID" ? (
            <p className="text-xs text-warning-foreground tabular-nums">
              {formatCurrency(row.balance)} due
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Paid in full</p>
          )}
        </div>
      ),
    },
    {
      id: "payment",
      header: "Collection",
      cell: (row) => (
        <div className="min-w-[7rem] space-y-1.5">
          <PaymentStatusBadge
            status={row.status}
            balance={row.balance}
            paidAmount={row.paidAmount}
          />
          <RentalInvoicePaymentProgressBar invoice={row} />
        </div>
      ),
    },
    {
      id: "createdAt",
      header: (
        <SortableColumnHeader
          label="Created"
          field="createdAt"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
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
              <DropdownMenuItem onClick={() => onIssue(row)}>Issue invoice</DropdownMenuItem>
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
      ),
      className: "w-12 text-right",
      headerClassName: "w-12",
    },
  ];
}
