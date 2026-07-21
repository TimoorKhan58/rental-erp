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
import { RepairWorkflowProgressBar } from "../components/repair-workflow-progress-bar";
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
          label="Repair"
          field="repairNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link href={ROUTES.repairDetail(row.id)} className="group block min-w-[8rem]">
          <span className="font-medium text-primary group-hover:underline">
            {row.repairNumber}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {returnLabelById.get(row.returnId) ?? row.returnId}
          </span>
        </Link>
      ),
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <span className="text-sm">
          {productLabelById.get(row.productId) ?? row.productId}
        </span>
      ),
    },
    {
      id: "workflow",
      header: "Progress",
      cell: (row) => (
        <div className="min-w-[8rem] space-y-1.5">
          <RepairStatusBadge status={row.status} />
          <RepairWorkflowProgressBar status={row.status} />
        </div>
      ),
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
      cell: (row) => (
        <div className="min-w-[6rem] text-sm">
          <p className="font-medium">{formatDate(row.repairDate)}</p>
          <p className="text-xs text-muted-foreground">
            {row.quantity} unit{row.quantity === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      id: "repairCost",
      header: "Cost",
      cell: (row) => (
        <span className="font-medium tabular-nums">{formatCurrency(row.repairCost)}</span>
      ),
    },
    {
      id: "technician",
      header: "Technician",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.technician ?? "—"}</span>
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
