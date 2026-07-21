"use client";

import Link from "next/link";
import { MoreHorizontalIcon, PhoneIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { CustomerAvatar } from "../components/customer-avatar";
import { CustomerStatusBadge } from "../components/customer-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { CustomerResponse, CustomerSortField, ListCustomersParams } from "../types";

type CustomerTableColumnOptions = {
  params: ListCustomersParams;
  onSort: (field: CustomerSortField, order: ListCustomersParams["sortOrder"]) => void;
  selectedIds: Set<string>;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean, ids: string[]) => void;
  allRowIds: string[];
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (customer: CustomerResponse) => void;
  onToggleStatus: (customer: CustomerResponse) => void;
};

export function getCustomerTableColumns({
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
}: CustomerTableColumnOptions): Array<DataTableColumn<CustomerResponse>> {
  const allSelected = allRowIds.length > 0 && allRowIds.every((id) => selectedIds.has(id));

  const columns: Array<DataTableColumn<CustomerResponse>> = [
    {
      id: "select",
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => onToggleAll(Boolean(checked), allRowIds)}
          aria-label="Select all customers"
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
      id: "customer",
      header: (
        <SortableColumnHeader
          label="Customer"
          field="name"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.customerDetail(row.id)}
          className="group flex items-center gap-3 rounded-lg py-0.5 transition-colors hover:opacity-90"
        >
          <CustomerAvatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground group-hover:text-primary">
              {row.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{row.customerCode}</p>
          </div>
        </Link>
      ),
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
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <PhoneIcon className="size-3.5 shrink-0 text-primary/60" aria-hidden="true" />
          {row.phone}
        </span>
      ),
    },
    {
      id: "address",
      header: "Address",
      cell: (row) => (
        <span className="line-clamp-1 max-w-xs text-sm text-muted-foreground">
          {row.address?.trim() ? row.address : "—"}
        </span>
      ),
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
      cell: (row) => <CustomerStatusBadge isActive={row.isActive} />,
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
                aria-label={`Actions for ${row.name}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.customerDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            {canUpdate ? (
              <DropdownMenuItem render={<Link href={ROUTES.customerEdit(row.id)} />}>
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
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(row)}>
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: cn("w-12 text-right"),
      headerClassName: "w-12",
    },
  ];

  return columns;
}
