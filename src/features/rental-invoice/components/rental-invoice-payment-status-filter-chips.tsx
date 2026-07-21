"use client";

import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS } from "../mappers";
import type { PaymentStatusFilter } from "../types";

type PaymentStatusFilterValue = PaymentStatusFilter | "all";

type RentalInvoicePaymentStatusFilterChipsProps = {
  value: PaymentStatusFilterValue;
  onChange: (value: PaymentStatusFilterValue) => void;
  counts?: Partial<Record<PaymentStatusFilterValue, number>>;
  className?: string;
};

const PAYMENT_STATUS_FILTERS: PaymentStatusFilter[] = ["unpaid", "partial", "paid", "void"];

const filterOptions: Array<{ value: PaymentStatusFilterValue; label: string }> = [
  { value: "all", label: "All payments" },
  ...PAYMENT_STATUS_FILTERS.map((status) => ({
    value: status,
    label: PAYMENT_STATUS_LABELS[status],
  })),
];

export function RentalInvoicePaymentStatusFilterChips({
  value,
  onChange,
  counts,
  className,
}: RentalInvoicePaymentStatusFilterChipsProps) {
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
