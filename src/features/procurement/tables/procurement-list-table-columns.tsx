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
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { canApproveProcurement, canCancelProcurement, canEditProcurement, canReceiveProcurement } from "../mappers";
import { ProcurementStatusBadge } from "../components/procurement-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { ListProcurementsParams, ProcurementResponse, ProcurementSortField } from "../types";

type ProcurementTableColumnOptions = {
  params: ListProcurementsParams;
  onSort: (field: ProcurementSortField, order: ListProcurementsParams["sortOrder"]) => void;
  supplierLabelById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
  canUpdate: boolean;
  canApprove: boolean;
  canReceive: boolean;
  canCancel: boolean;
  onApprove: (procurement: ProcurementResponse) => void;
  onReceive: (procurement: ProcurementResponse) => void;
  onCancel: (procurement: ProcurementResponse) => void;
};

export function getProcurementTableColumns({
  params,
  onSort,
  supplierLabelById,
  warehouseLabelById,
  canUpdate,
  canApprove,
  canReceive,
  canCancel,
  onApprove,
  onReceive,
  onCancel,
}: ProcurementTableColumnOptions): Array<DataTableColumn<ProcurementResponse>> {
  return [
    {
      id: "poNumber",
      header: (
        <SortableColumnHeader
          label="Purchase"
          field="poNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      // Who it is bought from comes first, like customers on orders and invoices.
      cell: (row) => (
        <Link
          href={ROUTES.procurementDetail(row.id)}
          className={cn("group block min-w-[8rem]", row.status === "CANCELLED" && "opacity-60")}
        >
          <span className="block font-medium text-foreground group-hover:text-primary group-hover:underline">
            {nameOnly(supplierLabelById.get(row.supplierId) ?? row.supplierId)}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{row.poNumber}</span>
        </Link>
      ),
    },
    {
      id: "warehouse",
      header: "Goes to",
      cell: (row) => nameOnly(warehouseLabelById.get(row.warehouseId) ?? row.warehouseId),
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
      cell: (row) => <ProcurementStatusBadge status={row.status} />,
    },
    {
      id: "total",
      header: "Total",
      cell: (row) => formatCurrency(row.orderTotal),
    },
    {
      id: "paidAmount",
      header: "Paid",
      cell: (row) => (
        <span className={row.status === "CANCELLED" ? "text-muted-foreground" : undefined}>
          {formatCurrency(row.paidAmount)}
        </span>
      ),
    },
    {
      id: "balance",
      header: "Still owed",
      // Only what you really still owe stands out.
      cell: (row) =>
        row.status !== "CANCELLED" && row.balance > 0 ? (
          <span className="font-medium tabular-nums text-warning-foreground">{formatCurrency(row.balance)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "orderDate",
      header: (
        <SortableColumnHeader
          label="Order date"
          field="orderDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.orderDate),
    },
    {
      id: "expectedDate",
      header: (
        <SortableColumnHeader
          label="Expected"
          field="expectedDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (row.expectedDate ? formatDate(row.expectedDate) : "—"),
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
                aria-label={`Actions for ${row.poNumber}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.procurementDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            {canUpdate && canEditProcurement(row.status) ? (
              <DropdownMenuItem render={<Link href={ROUTES.procurementEdit(row.id)} />}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {canApprove && canApproveProcurement(row.status) ? (
              <DropdownMenuItem onClick={() => onApprove(row)}>Approve</DropdownMenuItem>
            ) : null}
            {canReceive && canReceiveProcurement(row.status) ? (
              <DropdownMenuItem onClick={() => onReceive(row)}>Receive goods</DropdownMenuItem>
            ) : null}
            {canCancel && canCancelProcurement(row.status, row.items) ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onCancel(row)}>
                  Cancel
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

/** "SUP-00001 — Ali Traders" → "Ali Traders". */
function nameOnly(label: string): string {
  const separator = " — ";
  return label.includes(separator) ? label.split(separator).slice(1).join(separator) : label;
}
