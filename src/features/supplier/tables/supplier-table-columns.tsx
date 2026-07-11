"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import type { DataTableColumn } from "@/components/shared";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SupplierStatusBadge } from "../components/supplier-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { SupplierResponse, SupplierSortField, ListSuppliersParams } from "../types";

type SupplierTableColumnOptions = {
  params: ListSuppliersParams;
  onSort: (field: SupplierSortField, order: ListSuppliersParams["sortOrder"]) => void;
  selectedIds: Set<string>;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean, ids: string[]) => void;
  allRowIds: string[];
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (supplier: SupplierResponse) => void;
  onToggleStatus: (supplier: SupplierResponse) => void;
};

export function getSupplierTableColumns({
  params,
  onSort,
  selectedIds,
  onToggleRow,
  onToggleAll,
  allRowIds,
  canUpdate,
  canDelete,
  onDelete,
  onToggleStatus,
}: SupplierTableColumnOptions): Array<DataTableColumn<SupplierResponse>> {
  const allSelected = allRowIds.length > 0 && allRowIds.every((id) => selectedIds.has(id));

  const columns: Array<DataTableColumn<SupplierResponse>> = [
    {
      id: "select",
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => onToggleAll(Boolean(checked), allRowIds)}
          aria-label="Select all suppliers"
        />
      ),
      cell: (row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={(checked) => onToggleRow(row.id, Boolean(checked))}
          aria-label={`Select ${row.name}`}
        />
      ),
      className: "w-10",
      headerClassName: "w-10",
    },
    {
      id: "supplierCode",
      header: (
        <SortableColumnHeader
          label="Code"
          field="supplierCode"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.supplierDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.supplierCode}
        </Link>
      ),
    },
    {
      id: "name",
      header: (
        <SortableColumnHeader
          label="Name"
          field="name"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => row.name,
    },
    {
      id: "phone",
      header: (
        <SortableColumnHeader
          label="Phone"
          field="phone"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => row.phone,
    },
    {
      id: "email",
      header: (
        <SortableColumnHeader
          label="Email"
          field="email"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => row.email ?? "—",
    },
    {
      id: "isActive",
      header: (
        <SortableColumnHeader
          label="Status"
          field="isActive"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <SupplierStatusBadge isActive={row.isActive} />,
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
                aria-label={`Actions for ${row.name}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.supplierDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            {canUpdate ? (
              <DropdownMenuItem render={<Link href={ROUTES.supplierEdit(row.id)} />}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {canUpdate ? (
              <DropdownMenuItem onClick={() => onToggleStatus(row)}>
                {row.isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(row)}
                >
                  Delete
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

  return columns;
}
