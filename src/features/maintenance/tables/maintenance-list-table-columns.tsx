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
  canCancelMaintenance,
  canCompleteMaintenance,
  canEditMaintenance,
  canStartMaintenance,
  SERVICE_TYPE_LABELS,
} from "../mappers";
import { MaintenanceStatusBadge } from "../components/maintenance-status-badge";
import { MaintenanceWorkflowProgressBar } from "../components/maintenance-workflow-progress-bar";
import { SortableColumnHeader } from "./sortable-column-header";
import type {
  ListMaintenancesParams,
  MaintenanceResponse,
  MaintenanceSortField,
} from "../types";

type MaintenanceTableColumnOptions = {
  params: ListMaintenancesParams;
  onSort: (field: MaintenanceSortField, order: ListMaintenancesParams["sortOrder"]) => void;
  productLabelById: Map<string, string>;
  canUpdate: boolean;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onStart: (maintenance: MaintenanceResponse) => void;
  onComplete: (maintenance: MaintenanceResponse) => void;
  onCancel: (maintenance: MaintenanceResponse) => void;
};

export function getMaintenanceTableColumns({
  params,
  onSort,
  productLabelById,
  canUpdate,
  canStart,
  canComplete,
  canCancel,
  onStart,
  onComplete,
  onCancel,
}: MaintenanceTableColumnOptions): Array<DataTableColumn<MaintenanceResponse>> {
  return [
    {
      id: "maintenanceNumber",
      header: (
        <SortableColumnHeader
          label="Maintenance"
          field="maintenanceNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link href={ROUTES.maintenanceDetail(row.id)} className="group block min-w-[8rem]">
          <span className="font-medium text-primary group-hover:underline">
            {row.maintenanceNumber}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {SERVICE_TYPE_LABELS[row.serviceType]}
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
          <MaintenanceStatusBadge status={row.status} />
          <MaintenanceWorkflowProgressBar status={row.status} />
        </div>
      ),
    },
    {
      id: "scheduledDate",
      header: (
        <SortableColumnHeader
          label="Scheduled"
          field="scheduledDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <div className="min-w-[6rem] text-sm">
          <p className="font-medium">{formatDate(row.scheduledDate)}</p>
          <p className="text-xs text-muted-foreground">
            {row.quantity} unit{row.quantity === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      id: "estimatedCost",
      header: "Est. cost",
      cell: (row) => (
        <span className="font-medium tabular-nums">{formatCurrency(row.estimatedCost)}</span>
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
                aria-label={`Actions for ${row.maintenanceNumber}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.maintenanceDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            {canUpdate && canEditMaintenance(row.status) ? (
              <DropdownMenuItem render={<Link href={ROUTES.maintenanceEdit(row.id)} />}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {canStart && canStartMaintenance(row.status) ? (
              <DropdownMenuItem onClick={() => onStart(row)}>Start maintenance</DropdownMenuItem>
            ) : null}
            {canComplete && canCompleteMaintenance(row.status) ? (
              <DropdownMenuItem onClick={() => onComplete(row)}>
                Complete maintenance
              </DropdownMenuItem>
            ) : null}
            {canCancel && canCancelMaintenance(row.status) ? (
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
