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
  DELIVERY_METHOD_LABELS,
  getDispatchTotalQuantity,
} from "../mappers";
import { DispatchStatusBadge } from "../components/dispatch-status-badge";
import { DispatchWorkflowProgressBar } from "../components/dispatch-workflow-progress-bar";
import { SortableColumnHeader } from "./sortable-column-header";
import type { DispatchResponse, DispatchSortField, ListDispatchesParams } from "../types";

type DispatchTableColumnOptions = {
  params: ListDispatchesParams;
  onSort: (field: DispatchSortField, order: ListDispatchesParams["sortOrder"]) => void;
  rentalOrderLabelById: Map<string, string>;
  rentalOrderWarehouseById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
  warehouseNameById: Map<string, string>;
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
  warehouseNameById,
  canUpdate,
  canComplete,
  canCancel,
  onMarkReady,
  onComplete,
  onCancel,
}: DispatchTableColumnOptions): Array<DataTableColumn<DispatchResponse>> {
  const resolveWarehouseName = (rentalOrderId: string) => {
    const warehouseId = rentalOrderWarehouseById.get(rentalOrderId);
    if (!warehouseId) {
      return "—";
    }

    return warehouseNameById.get(warehouseId) ?? warehouseLabelById.get(warehouseId) ?? warehouseId;
  };

  return [
    {
      id: "dispatchNumber",
      header: (
        <SortableColumnHeader
          label="Delivery"
          field="dispatchNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link href={ROUTES.dispatchDetail(row.id)} className="group block min-w-[8rem]">
          <span className="font-medium text-primary group-hover:underline">
            {row.dispatchNumber}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {rentalOrderLabelById.get(row.rentalOrderId) ?? row.rentalOrderId}
          </span>
        </Link>
      ),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => (
        <span className="text-sm">{resolveWarehouseName(row.rentalOrderId)}</span>
      ),
    },
    {
      id: "dispatchDate",
      header: (
        <SortableColumnHeader
          label="Schedule"
          field="dispatchDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <div className="min-w-[7rem] text-sm">
          <p className="font-medium">{formatDate(row.dispatchDate)}</p>
          <p className="text-xs text-muted-foreground">
            {DELIVERY_METHOD_LABELS[row.deliveryMethod]}
          </p>
        </div>
      ),
    },
    {
      id: "workflow",
      header: "Progress",
      cell: (row) => (
        <div className="min-w-[8rem] space-y-1.5">
          <DispatchStatusBadge status={row.status} />
          <DispatchWorkflowProgressBar status={row.status} />
        </div>
      ),
    },
    {
      id: "quantity",
      header: "Units",
      cell: (row) => (
        <span className="tabular-nums font-medium">
          {getDispatchTotalQuantity(row).toLocaleString()}
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
