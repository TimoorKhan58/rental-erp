"use client";

import { DownloadIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ExportPlaceholderButtonProps = {
  disabled?: boolean;
};

/**
 * Export UI placeholder — backend has no PDF/Excel/CSV export endpoints yet.
 */
export function ExportPlaceholderButton({ disabled = true }: ExportPlaceholderButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<DownloadIcon className="size-4" aria-hidden="true" />}
            disabled={disabled}
            aria-label="Export report"
          />
        }
      >
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>PDF (coming soon)</DropdownMenuItem>
        <DropdownMenuItem disabled>Excel (coming soon)</DropdownMenuItem>
        <DropdownMenuItem disabled>CSV (coming soon)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
