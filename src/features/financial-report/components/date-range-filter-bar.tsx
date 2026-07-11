"use client";

import { Input } from "@/components/ui/input";

type DateRangeFilterBarProps = {
  dateFrom?: string;
  dateTo?: string;
  onChange: (from?: string, to?: string) => void;
  asOfDate?: string;
  onAsOfDateChange?: (value?: string) => void;
  mode?: "range" | "asOf";
};

export function DateRangeFilterBar({
  dateFrom,
  dateTo,
  onChange,
  asOfDate,
  onAsOfDateChange,
  mode = "range",
}: DateRangeFilterBarProps) {
  if (mode === "asOf") {
    return (
      <Input
        type="date"
        value={asOfDate ?? ""}
        onChange={(event) => onAsOfDateChange?.(event.target.value || undefined)}
        className="w-full sm:w-44"
        aria-label="As of date"
      />
    );
  }

  return (
    <>
      <Input
        type="date"
        value={dateFrom ?? ""}
        onChange={(event) => onChange(event.target.value || undefined, dateTo)}
        className="w-full sm:w-40"
        aria-label="Date from"
      />
      <Input
        type="date"
        value={dateTo ?? ""}
        onChange={(event) => onChange(dateFrom, event.target.value || undefined)}
        className="w-full sm:w-40"
        aria-label="Date to"
      />
    </>
  );
}
