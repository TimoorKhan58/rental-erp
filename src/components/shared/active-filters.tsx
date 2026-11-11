"use client";

import { XIcon } from "lucide-react";
import { AppButton } from "@/components/design-system/button";
import { cn } from "@/lib/utils";

export type ActiveFilterChip = {
  id: string;
  label: string;
  onClear: () => void;
};

type ActiveFiltersProps = {
  filters: ActiveFilterChip[];
  onClearAll: () => void;
  className?: string;
};

export function ActiveFilters({ filters, onClearAll, className }: ActiveFiltersProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2",
        className,
      )}
      aria-label="Active filters"
    >
      <span className="text-xs font-medium text-muted-foreground">Filters:</span>
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={filter.onClear}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs text-foreground hover:bg-muted/50"
        >
          {filter.label}
          <XIcon className="size-3 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Remove {filter.label}</span>
        </button>
      ))}
      <AppButton
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onClearAll}
      >
        Clear all
      </AppButton>
    </div>
  );
}
