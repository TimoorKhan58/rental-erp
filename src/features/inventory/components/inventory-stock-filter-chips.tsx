"use client";

import { cn } from "@/lib/utils";
import type { StockStatusFilter } from "../types";

type StockFilterValue = StockStatusFilter | "all";

type InventoryStockFilterChipsProps = {
  value: StockFilterValue;
  onChange: (value: StockFilterValue) => void;
  counts?: Partial<Record<StockFilterValue, number>>;
  className?: string;
};

const filterOptions: Array<{ value: StockFilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "in-stock", label: "Available" },
  { value: "low-stock", label: "Shortage" },
  { value: "out-of-stock", label: "Out" },
  { value: "overstock", label: "Overstock" },
];

export function InventoryStockFilterChips({
  value,
  onChange,
  counts,
  className,
}: InventoryStockFilterChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      role="group"
      aria-label="Filter by stock status"
    >
      {filterOptions.map((option) => {
        const isActive = value === option.value;
        const count = counts?.[option.value];

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {option.label}
            {count !== undefined ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {count.toLocaleString()}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
