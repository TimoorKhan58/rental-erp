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
import {
  calculateOrderTotal,
  calculateRentalDays,
  canCancelRentalOrder,
  canConfirmRentalOrder,
  canEditRentalOrder,
  canReserveRentalOrder,
} from "../mappers";
import { RentalOrderStatusBadge } from "../components/rental-order-status-badge";
import { RentalReservationBadge } from "../components/rental-reservation-badge";
import { deriveReservationStatus } from "../mappers";
import { SortableColumnHeader } from "./sortable-column-header";
import type { ListRentalOrdersParams, RentalOrderResponse, RentalOrderSortField } from "../types";

type RentalOrderTableColumnOptions = {
  params: ListRentalOrdersParams;
  onSort: (field: RentalOrderSortField, order: ListRentalOrdersParams["sortOrder"]) => void;
  customerLabelById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
  canUpdate: boolean;
  canConfirm: boolean;
  canReserve: boolean;
  canCancel: boolean;
  onConfirm: (order: RentalOrderResponse) => void;
  onReserve: (order: RentalOrderResponse) => void;
  onCancel: (order: RentalOrderResponse) => void;
};

export function getRentalOrderTableColumns({
  params,
  onSort,
  customerLabelById,
  warehouseLabelById,
  canUpdate,
  canConfirm,
  canReserve,
  canCancel,
  onConfirm,
  onReserve,
  onCancel,
}: RentalOrderTableColumnOptions): Array<DataTableColumn<RentalOrderResponse>> {
  return [
    {
      id: "orderNumber",
      header: (
        <SortableColumnHeader
          label="Order number"
          field="orderNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.rentalOrderDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.orderNumber}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: (row) => customerLabelById.get(row.customerId) ?? row.customerId,
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => warehouseLabelById.get(row.warehouseId) ?? row.warehouseId,
    },
    {
      id: "startDate",
      header: (
        <SortableColumnHeader
          label="Rental start"
          field="eventStartDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.startDate),
    },
    {
      id: "endDate",
      header: (
        <SortableColumnHeader
          label="Rental end"
          field="eventEndDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.endDate),
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
      cell: (row) => <RentalOrderStatusBadge status={row.status} />,
    },
    {
      id: "reservation",
      header: "Reservation",
      cell: (row) => (
        <RentalReservationBadge status={deriveReservationStatus(row)} />
      ),
    },
    {
      id: "total",
      header: "Total",
      cell: (row) =>
        formatCurrency(
          calculateOrderTotal(row.items, calculateRentalDays(row.startDate, row.endDate)),
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
      cell: (row) => formatDate(row.createdAt),
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
                aria-label={`Actions for ${row.orderNumber}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.rentalOrderDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            {canUpdate && canEditRentalOrder(row.status) ? (
              <DropdownMenuItem render={<Link href={ROUTES.rentalOrderEdit(row.id)} />}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {canConfirm && canConfirmRentalOrder(row.status) ? (
              <DropdownMenuItem onClick={() => onConfirm(row)}>Confirm</DropdownMenuItem>
            ) : null}
            {canReserve && canReserveRentalOrder(row.status) ? (
              <DropdownMenuItem onClick={() => onReserve(row)}>Reserve inventory</DropdownMenuItem>
            ) : null}
            {canCancel && canCancelRentalOrder(row.status, row.items) ? (
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
