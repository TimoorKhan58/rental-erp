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
import { RentalInvoiceStatusBadge } from "../components/rental-invoice-status-badge";
import { PaymentStatusBadge } from "../components/payment-status-badge";
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
          label="Invoice number"
          field="invoiceNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.rentalInvoiceDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: (row) => customerLabelById.get(row.customerId) ?? row.customerId,
    },
    {
      id: "rentalOrder",
      header: "Rental order",
      cell: (row) => rentalOrderLabelById.get(row.rentalOrderId) ?? row.rentalOrderId,
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
      cell: (row) => formatDate(row.invoiceDate),
    },
    {
      id: "dueDate",
      header: (
        <SortableColumnHeader
          label="Due date"
          field="dueDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (row.dueDate ? formatDate(row.dueDate) : "—"),
    },
    {
      id: "status",
      header: (
        <SortableColumnHeader
          label="Status"
          field="status"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <RentalInvoiceStatusBadge status={row.status} />,
    },
    {
      id: "grandTotal",
      header: (
        <SortableColumnHeader
          label="Total"
          field="grandTotal"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatCurrency(row.grandTotal),
    },
    {
      id: "balance",
      header: "Outstanding",
      cell: (row) => formatCurrency(row.balance),
    },
    {
      id: "paymentStatus",
      header: "Payment",
      cell: (row) => (
        <PaymentStatusBadge
          status={row.status}
          balance={row.balance}
          paidAmount={row.paidAmount}
        />
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
