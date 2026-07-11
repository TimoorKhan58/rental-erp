"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import type { DataTableColumn } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";
import { AuditActionBadge } from "../components/audit-action-badge";
import { AuditStatusBadge } from "../components/audit-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { AuditLogResponse, AuditSortField, ListAuditLogsParams } from "../types";

export type AuditColumnId =
  | "createdAt"
  | "action"
  | "status"
  | "module"
  | "entityName"
  | "recordId"
  | "userId"
  | "requestId"
  | "actions";

type AuditTableColumnOptions = {
  params: ListAuditLogsParams;
  onSort: (field: AuditSortField, order: ListAuditLogsParams["sortOrder"]) => void;
  visibleColumns: Set<AuditColumnId>;
  onPreview: (audit: AuditLogResponse) => void;
};

export function getAuditTableColumns({
  params,
  onSort,
  visibleColumns,
  onPreview,
}: AuditTableColumnOptions): Array<DataTableColumn<AuditLogResponse>> {
  const columns: Array<DataTableColumn<AuditLogResponse>> = [];

  if (visibleColumns.has("createdAt")) {
    columns.push({
      id: "createdAt",
      header: (
        <SortableColumnHeader
          label="Timestamp"
          field="createdAt"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDateTime(row.createdAt),
    });
  }

  if (visibleColumns.has("action")) {
    columns.push({
      id: "action",
      header: (
        <SortableColumnHeader
          label="Action"
          field="action"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <AuditActionBadge action={row.action} />,
    });
  }

  if (visibleColumns.has("status")) {
    columns.push({
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
      cell: (row) => <AuditStatusBadge status={row.status} />,
    });
  }

  if (visibleColumns.has("module")) {
    columns.push({
      id: "module",
      header: (
        <SortableColumnHeader
          label="Module"
          field="module"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => row.module,
    });
  }

  if (visibleColumns.has("entityName")) {
    columns.push({
      id: "entityName",
      header: (
        <SortableColumnHeader
          label="Entity"
          field="entityName"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.auditDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.entityName}
        </Link>
      ),
    });
  }

  if (visibleColumns.has("recordId")) {
    columns.push({
      id: "recordId",
      header: (
        <SortableColumnHeader
          label="Entity ID"
          field="recordId"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="font-mono text-xs" title={row.recordId}>
          {row.recordId.slice(0, 8)}…
        </span>
      ),
    });
  }

  if (visibleColumns.has("userId")) {
    columns.push({
      id: "userId",
      header: (
        <SortableColumnHeader
          label="Actor"
          field="userId"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) =>
        row.userId ? (
          <span className="font-mono text-xs" title={row.userId}>
            {row.userId.slice(0, 8)}…
          </span>
        ) : (
          "—"
        ),
    });
  }

  if (visibleColumns.has("requestId")) {
    columns.push({
      id: "requestId",
      header: "Request ID",
      cell: (row) =>
        row.requestId ? (
          <span className="font-mono text-xs" title={row.requestId}>
            {row.requestId.slice(0, 8)}…
          </span>
        ) : (
          "—"
        ),
    });
  }

  if (visibleColumns.has("actions")) {
    columns.push({
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <AppButton
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for audit ${row.id}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.auditDetail(row.id)} />}>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPreview(row)}>Quick preview</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12 text-right",
      headerClassName: "w-12",
    });
  }

  return columns;
}
