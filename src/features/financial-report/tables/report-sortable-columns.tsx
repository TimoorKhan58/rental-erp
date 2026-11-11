"use client";

import type { DataTableColumn } from "@/components/shared";

import { ReportSortableColumnHeader } from "../components/report-sortable-column-header";

type SortParams = {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function withReportSorting<T>(
  columns: Array<DataTableColumn<T>>,
  sortableByColumnId: Record<string, string>,
  params: SortParams,
  onSort: (field: string, order?: "asc" | "desc") => void,
): Array<DataTableColumn<T>> {
  return columns.map((column) => {
    const sortField = sortableByColumnId[column.id];

    if (sortField === undefined || typeof column.header !== "string") {
      return column;
    }

    return {
      ...column,
      header: (
        <ReportSortableColumnHeader
          label={column.header}
          field={sortField}
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
          className={column.headerClassName}
        />
      ),
    };
  });
}
