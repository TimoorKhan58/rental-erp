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
  canCancelRepair,
  canCompleteRepair,
  canEditRepair,
  canStartRepair,
} from "../mappers";
import { RepairStatusBadge } from "../components/repair-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { ListRepairsParams, RepairResponse, RepairSortField } from "../types";

type RepairTableColumnOptions = {
  params: ListRepairsParams;
  onSort: (field: RepairSortField, order: ListRepairsParams["sortOrder"]) => void;
  returnLabelById: Map<string, string>;
  productLabelById: Map<string, string>;
  canUpdate: boolean;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onStart: (repair: RepairResponse) => void;
  onComplete: (repair: RepairResponse) => void;
  onCancel: (repair: RepairResponse) => void;
};

export function getRepairTableColumns({
  params,
  onSort,
  returnLabelById,
  productLabelById,
  canUpdate,
  canStart,
  canComplete,
  canCancel,
  onStart,
  onComplete,
  onCancel,
}: RepairTableColumnOptions): Array<DataTableColumn<RepairResponse>> {
  return [
    {
      id: "repairNumber",
      header: (
        <SortableColumnHeader
          label="Repair number"
          field="repairNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.repairDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.repairNumber}
        </Link>
      ),
    },
    {
      id: "return",
      header: "Return",
      cell: (row) => returnLabelById.get(row.returnId) ?? row.returnId,
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => productLabelById.get(row.productId) ?? row.productId,
    },
    {
      id: "technician",
      header: "Technician",
      cell: (row) => row.technician ?? "—",
    },
    {
      id: "repairDate",
      header: (
        <SortableColumnHeader
          label="Repair date"
          field="repairDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.repairDate),
    },
    {
      id: "repairCost",
      header: "Repair cost",
      cell: (row) => formatCurrency(row.repairCost),
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
      cell: (row) => <RepairStatusBadge status={row.status} />,
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
                aria-label={`Actions for ${row.repairNumber}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.repairDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            {canUpdate && canEditRepair(row.status) ? (
              <DropdownMenuItem render={<Link href={ROUTES.repairEdit(row.id)} />}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {canStart && canStartRepair(row.status) ? (
              <DropdownMenuItem onClick={() => onStart(row)}>Start repair</DropdownMenuItem>
            ) : null}
            {canComplete && canCompleteRepair(row.status) ? (
              <DropdownMenuItem onClick={() => onComplete(row)}>Complete repair</DropdownMenuItem>
            ) : null}
            {canCancel && canCancelRepair(row.status) ? (
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
