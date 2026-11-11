"use client";

import { Input } from "@/components/ui/input";

type DateRangeFilterBarProps = {
  dateFrom?: string;
  dateTo?: string;
  onChange: (from?: string, to?: string) => void;
  asOfDate?: string;
  onAsOfDateChange?: (value?: string) => void;
  mode?: "range" | "asOf";
  fieldHint?: string;
};

export function DateRangeFilterBar({
  dateFrom,
  dateTo,
  onChange,
  asOfDate,
  onAsOfDateChange,
  mode = "range",
  fieldHint,
}: DateRangeFilterBarProps) {
  if (mode === "asOf") {
    return (
      <div className="flex flex-col gap-1">
        <Input
          type="date"
          value={asOfDate ?? ""}
          onChange={(event) => onAsOfDateChange?.(event.target.value || undefined)}
          className="w-full sm:w-44"
          aria-label={fieldHint ? `As of date (${fieldHint})` : "As of date"}
        />
        {fieldHint ? (
          <p className="text-xs text-muted-foreground">{fieldHint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={dateFrom ?? ""}
          onChange={(event) => onChange(event.target.value || undefined, dateTo)}
          className="w-full sm:w-40"
          aria-label={fieldHint ? `Date from (${fieldHint})` : "Date from"}
        />
        <Input
          type="date"
          value={dateTo ?? ""}
          onChange={(event) => onChange(dateFrom, event.target.value || undefined)}
          className="w-full sm:w-40"
          aria-label={fieldHint ? `Date to (${fieldHint})` : "Date to"}
        />
      </div>
      {fieldHint ? (
        <p className="text-xs text-muted-foreground">{fieldHint}</p>
      ) : null}
    </div>
  );
}
