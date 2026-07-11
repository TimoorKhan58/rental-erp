"use client";

import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/feedback";
import { SkeletonTable } from "@/components/loading";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type TableDensity = "comfortable" | "compact";

type DataTableShellProps<T> = {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  density?: TableDensity;
  toolbar?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  emptyState?: ReactNode;
  loadingState?: ReactNode;
  pagination?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  stickyHeader?: boolean;
};

const densityClasses: Record<TableDensity, { head: string; cell: string }> = {
  comfortable: { head: "h-10 px-3", cell: "px-3 py-3" },
  compact: { head: "h-8 px-2.5 text-xs", cell: "px-2.5 py-2 text-xs" },
};

/**
 * DataTableShell — enterprise table layout with toolbar, slots, and density.
 *
 * @example
 * <DataTableShell
 *   columns={columns}
 *   data={rows}
 *   getRowId={(row) => row.id}
 *   toolbar={<PageToolbar>...</PageToolbar>}
 *   search={<SearchInput />}
 *   pagination={<DataPagination meta={meta} onPageChange={setPage} />}
 * />
 */
export function DataTableShell<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  density = "comfortable",
  toolbar,
  search,
  filters,
  actions,
  emptyState,
  loadingState,
  pagination,
  emptyTitle = "No records found",
  emptyDescription,
  className,
  stickyHeader = true,
}: DataTableShellProps<T>) {
  const densityStyle = densityClasses[density];

  const renderTableBody = () => {
    if (isLoading) {
      return loadingState ?? <SkeletonTable columns={columns.length} />;
    }

    if (data.length === 0) {
      return (
        emptyState ?? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            className="border-0 bg-transparent"
          />
        )
      );
    }

    return (
      <div className="overflow-safe rounded-lg border border-border">
        <Table>
          <TableHeader
            className={cn(stickyHeader && "sticky top-0 z-[var(--z-sticky)] bg-background")}
          >
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(densityStyle.head, column.headerClassName)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(densityStyle.cell, column.className)}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar}
      {(search || filters || actions) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {search}
            {filters}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {renderTableBody()}
      {pagination ? <div className="flex justify-end">{pagination}</div> : null}
    </div>
  );
}

/** Backward-compatible alias of Phase 7-001 DataTable. */
export function DataTable<T>(props: Omit<DataTableShellProps<T>, "toolbar" | "search" | "filters" | "actions" | "pagination">) {
  return <DataTableShell {...props} />;
}
