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
  deriveReservationStatus,
  getOrderReservedUnits,
} from "../mappers";
import { RentalOrderStatusBadge } from "../components/rental-order-status-badge";
import { RentalReservationBadge } from "../components/rental-reservation-badge";
import { RentalOrderReservationProgressBar } from "../components/rental-order-reservation-progress-bar";
import { SortableColumnHeader } from "./sortable-column-header";
import type { ListRentalOrdersParams, RentalOrderResponse, RentalOrderSortField } from "../types";

type RentalOrderTableColumnOptions = {
  params: ListRentalOrdersParams;
  onSort: (field: RentalOrderSortField, order: ListRentalOrdersParams["sortOrder"]) => void;
  customerLabelById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
  customerNameById: Map<string, string>;
  warehouseNameById: Map<string, string>;
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
  customerNameById,
  warehouseNameById,
  canUpdate,
  canConfirm,
  canReserve,
  canCancel,
  onConfirm,
  onReserve,
  onCancel,
}: RentalOrderTableColumnOptions): Array<DataTableColumn<RentalOrderResponse>> {
  const resolveCustomerName = (customerId: string) =>
    customerNameById.get(customerId) ?? customerLabelById.get(customerId) ?? customerId;

  const resolveWarehouseName = (warehouseId: string) =>
    warehouseNameById.get(warehouseId) ?? warehouseLabelById.get(warehouseId) ?? warehouseId;

  return [
    {
      id: "orderNumber",
      header: (
        <SortableColumnHeader
          label="Order"
          field="orderNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link href={ROUTES.rentalOrderDetail(row.id)} className="group block min-w-[8rem]">
          <span className="font-medium text-primary group-hover:underline">
            {row.orderNumber}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {resolveCustomerName(row.customerId)}
          </span>
        </Link>
      ),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => (
        <span className="text-sm">{resolveWarehouseName(row.warehouseId)}</span>
      ),
    },
    {
      id: "rentalPeriod",
      header: (
        <SortableColumnHeader
          label="Rental period"
          field="eventStartDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => {
        const days = calculateRentalDays(row.startDate, row.endDate);

        return (
          <div className="min-w-[7rem] text-sm">
            <p className="font-medium tabular-nums">
              {days} day{days === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(row.startDate)} – {formatDate(row.endDate)}
            </p>
          </div>
        );
      },
    },
    {
      id: "reservation",
      header: "Reservation",
      cell: (row) => {
        const { reserved, total } = getOrderReservedUnits(row);

        return (
          <div className="min-w-[8rem] space-y-1.5">
            <RentalReservationBadge status={deriveReservationStatus(row)} />
            {row.status !== "CANCELLED" ? (
              <RentalOrderReservationProgressBar reserved={reserved} total={total} />
            ) : null}
          </div>
        );
      },
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
      id: "total",
      header: "Value",
      cell: (row) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(
            calculateOrderTotal(row.items, calculateRentalDays(row.startDate, row.endDate)),
          )}
        </span>
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
