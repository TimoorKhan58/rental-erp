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
  canCancelReturn,
  canCompleteReturn,
  canEditReturn,
  canInspectReturn,
  canReceiveReturn,
} from "../mappers";
import { ReturnStatusBadge } from "../components/return-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { ListReturnsParams, ReturnResponse, ReturnSortField } from "../types";

type ReturnTableColumnOptions = {
  params: ListReturnsParams;
  onSort: (field: ReturnSortField, order: ListReturnsParams["sortOrder"]) => void;
  rentalOrderLabelById: Map<string, string>;
  dispatchLabelById: Map<string, string>;
  canUpdate: boolean;
  canReceive: boolean;
  canInspect: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onReceive: (returnRecord: ReturnResponse) => void;
  onInspect: (returnRecord: ReturnResponse) => void;
  onComplete: (returnRecord: ReturnResponse) => void;
  onCancel: (returnRecord: ReturnResponse) => void;
};

export function getReturnTableColumns({
  params,
  onSort,
  rentalOrderLabelById,
  dispatchLabelById,
  canUpdate,
  canReceive,
  canInspect,
  canComplete,
  canCancel,
  onReceive,
  onInspect,
  onComplete,
  onCancel,
}: ReturnTableColumnOptions): Array<DataTableColumn<ReturnResponse>> {
  return [
    {
      id: "returnNumber",
      header: (
        <SortableColumnHeader
          label="Return number"
          field="returnNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.returnDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.returnNumber}
        </Link>
      ),
    },
    {
      id: "rentalOrder",
      header: "Rental order",
      cell: (row) => rentalOrderLabelById.get(row.rentalOrderId) ?? row.rentalOrderId,
    },
    {
      id: "dispatch",
      header: "Dispatch",
      cell: (row) => dispatchLabelById.get(row.dispatchId) ?? row.dispatchId,
    },
    {
      id: "returnDate",
      header: (
        <SortableColumnHeader
          label="Return date"
          field="inspectionDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.returnDate),
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
      cell: (row) => <ReturnStatusBadge status={row.status} />,
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
                aria-label={`Actions for ${row.returnNumber}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.returnDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            {canUpdate && canEditReturn(row.status) ? (
              <DropdownMenuItem render={<Link href={ROUTES.returnEdit(row.id)} />}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {canReceive && canReceiveReturn(row.status) ? (
              <DropdownMenuItem onClick={() => onReceive(row)}>Mark received</DropdownMenuItem>
            ) : null}
            {canInspect && canInspectReturn(row.status) ? (
              <DropdownMenuItem onClick={() => onInspect(row)}>Inspect items</DropdownMenuItem>
            ) : null}
            {canComplete && canCompleteReturn(row.status) ? (
              <DropdownMenuItem onClick={() => onComplete(row)}>Complete return</DropdownMenuItem>
            ) : null}
            {canCancel && canCancelReturn(row.status) ? (
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
