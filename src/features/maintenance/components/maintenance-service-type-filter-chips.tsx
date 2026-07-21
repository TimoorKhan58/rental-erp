"use client";

import { cn } from "@/lib/utils";
import { SERVICE_TYPE_LABELS } from "../mappers";
import { MAINTENANCE_SERVICE_TYPES, type MaintenanceServiceType } from "../types";

type ServiceTypeFilterValue = MaintenanceServiceType | "all";

type MaintenanceServiceTypeFilterChipsProps = {
  value: ServiceTypeFilterValue;
  onChange: (value: ServiceTypeFilterValue) => void;
  counts?: Partial<Record<ServiceTypeFilterValue, number>>;
  className?: string;
};

const filterOptions: Array<{ value: ServiceTypeFilterValue; label: string }> = [
  { value: "all", label: "All types" },
  ...MAINTENANCE_SERVICE_TYPES.map((type) => ({
    value: type,
    label: SERVICE_TYPE_LABELS[type],
  })),
];

export function MaintenanceServiceTypeFilterChips({
  value,
  onChange,
  counts,
  className,
}: MaintenanceServiceTypeFilterChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="Filter by service type"
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
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {option.label}
            {count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
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
