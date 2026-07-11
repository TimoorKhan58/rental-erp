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
import { formatDate } from "@/lib/utils";
import {
  canCancelDispatch,
  canCompleteDispatch,
  canEditDispatch,
  canMarkDispatchReady,
} from "../mappers";
import { DispatchStatusBadge } from "../components/dispatch-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { DispatchResponse, DispatchSortField, ListDispatchesParams } from "../types";

type DispatchTableColumnOptions = {
  params: ListDispatchesParams;
  onSort: (field: DispatchSortField, order: ListDispatchesParams["sortOrder"]) => void;
  rentalOrderLabelById: Map<string, string>;
  rentalOrderWarehouseById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
  canUpdate: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onMarkReady: (dispatch: DispatchResponse) => void;
  onComplete: (dispatch: DispatchResponse) => void;
  onCancel: (dispatch: DispatchResponse) => void;
};

export function getDispatchTableColumns({
  params,
  onSort,
  rentalOrderLabelById,
  rentalOrderWarehouseById,
  warehouseLabelById,
  canUpdate,
  canComplete,
  canCancel,
  onMarkReady,
  onComplete,
  onCancel,
}: DispatchTableColumnOptions): Array<DataTableColumn<DispatchResponse>> {
  const resolveWarehouseLabel = (rentalOrderId: string) => {
    const warehouseId = rentalOrderWarehouseById.get(rentalOrderId);
    return warehouseId
      ? (warehouseLabelById.get(warehouseId) ?? warehouseId)
      : "—";
  };

  return [
    {
      id: "dispatchNumber",
      header: (
        <SortableColumnHeader
          label="Dispatch number"
          field="dispatchNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.dispatchDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.dispatchNumber}
        </Link>
      ),
    },
    {
      id: "rentalOrder",
      header: "Rental order",
      cell: (row) => rentalOrderLabelById.get(row.rentalOrderId) ?? row.rentalOrderId,
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => resolveWarehouseLabel(row.rentalOrderId),
    },
    {
      id: "dispatchDate",
      header: (
        <SortableColumnHeader
          label="Dispatch date"
          field="dispatchDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.dispatchDate),
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
      cell: (row) => <DispatchStatusBadge status={row.status} />,
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
                aria-label={`Actions for ${row.dispatchNumber}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.dispatchDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            {canUpdate && canEditDispatch(row.status) ? (
              <DropdownMenuItem render={<Link href={ROUTES.dispatchEdit(row.id)} />}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {canUpdate && canMarkDispatchReady(row.status) ? (
              <DropdownMenuItem onClick={() => onMarkReady(row)}>Mark ready</DropdownMenuItem>
            ) : null}
            {canComplete && canCompleteDispatch(row.status) ? (
              <DropdownMenuItem onClick={() => onComplete(row)}>Complete dispatch</DropdownMenuItem>
            ) : null}
            {canCancel && canCancelDispatch(row.status) ? (
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
