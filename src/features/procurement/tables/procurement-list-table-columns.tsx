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
import { calculateOrderTotal, canApproveProcurement, canCancelProcurement, canEditProcurement, canReceiveProcurement } from "../mappers";
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
          label="PO number"
          field="poNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.procurementDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.poNumber}
        </Link>
      ),
    },
    {
      id: "supplier",
      header: "Supplier",
      cell: (row) => supplierLabelById.get(row.supplierId) ?? row.supplierId,
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => warehouseLabelById.get(row.warehouseId) ?? row.warehouseId,
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
      cell: (row) => formatCurrency(calculateOrderTotal(row.items)),
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
            <MoreHorizontalIcon className="size-4" />
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
