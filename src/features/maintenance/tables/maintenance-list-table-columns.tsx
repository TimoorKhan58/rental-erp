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
          label="Maintenance number"
          field="maintenanceNumber"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.maintenanceDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.maintenanceNumber}
        </Link>
      ),
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => productLabelById.get(row.productId) ?? row.productId,
    },
    {
      id: "serviceType",
      header: "Type",
      cell: (row) => SERVICE_TYPE_LABELS[row.serviceType],
    },
    {
      id: "scheduledDate",
      header: (
        <SortableColumnHeader
          label="Scheduled date"
          field="scheduledDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.scheduledDate),
    },
    {
      id: "technician",
      header: "Technician",
      cell: (row) => row.technician ?? "—",
    },
    {
      id: "estimatedCost",
      header: "Est. cost",
      cell: (row) => formatCurrency(row.estimatedCost),
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
      cell: (row) => <MaintenanceStatusBadge status={row.status} />,
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
