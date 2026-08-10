"use client";

import { DownloadIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCsv, type CsvColumnDef } from "@/lib/utils";

type ExportReportButtonProps<T> = {
  filename: string;
  rows: T[];
  columns: Array<CsvColumnDef<T>>;
  disabled?: boolean;
};

/**
 * Client-side report export. CSV is live; PDF/Excel remain deferred.
 */
export function ExportReportButton<T>({
  filename,
  rows,
  columns,
  disabled = false,
}: ExportReportButtonProps<T>) {
  const canCsv = !disabled && rows.length > 0 && columns.length > 0;

  const handleCsv = () => {
    if (!canCsv) return;
    downloadCsv(rows, columns, filename);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<DownloadIcon className="size-4" aria-hidden="true" />}
            disabled={disabled && !canCsv}
            aria-label="Export report"
          />
        }
      >
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>PDF (coming soon)</DropdownMenuItem>
        <DropdownMenuItem disabled>Excel (coming soon)</DropdownMenuItem>
        <DropdownMenuItem disabled={!canCsv} onClick={handleCsv}>
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** @deprecated Prefer ExportReportButton with CSV rows/columns. */
export function ExportPlaceholderButton({ disabled = true }: { disabled?: boolean }) {
  return (
    <ExportReportButton
      filename="report.csv"
      rows={[]}
      columns={[]}
      disabled={disabled}
    />
  );
}
