"use client";

import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "../mappers";
import { PAYMENT_STATUSES, type PaymentStatus } from "../types";

type StatusFilterValue = PaymentStatus | "all";

type PaymentStatusFilterChipsProps = {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  counts?: Partial<Record<StatusFilterValue, number>>;
  className?: string;
};

const filterOptions: Array<{ value: StatusFilterValue; label: string }> = [
  { value: "all", label: "All" },
  ...PAYMENT_STATUSES.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  })),
];

export function PaymentStatusFilterChips({
  value,
  onChange,
  counts,
  className,
}: PaymentStatusFilterChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="Filter by payment status"
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
