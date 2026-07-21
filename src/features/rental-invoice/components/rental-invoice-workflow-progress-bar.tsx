"use client";

import { cn } from "@/lib/utils";
import { getRentalInvoiceWorkflowProgress } from "../mappers/rental-invoice-summary.mapper";
import type { RentalInvoiceStatus } from "../types";

type RentalInvoiceWorkflowProgressBarProps = {
  status: RentalInvoiceStatus;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(status: RentalInvoiceStatus): string {
  switch (status) {
    case "PAID":
      return "bg-success";
    case "PARTIALLY_PAID":
      return "bg-warning";
    case "ISSUED":
      return "bg-info";
    case "DRAFT":
      return "bg-muted-foreground/40";
    case "VOID":
      return "bg-destructive/60";
  }
}

export function RentalInvoiceWorkflowProgressBar({
  status,
  size = "sm",
  className,
}: RentalInvoiceWorkflowProgressBarProps) {
  const fillPercent = getRentalInvoiceWorkflowProgress(status);
  const barColor = resolveBarColor(status);

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
        role="progressbar"
        aria-valuenow={fillPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Invoice workflow ${fillPercent}% complete`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
