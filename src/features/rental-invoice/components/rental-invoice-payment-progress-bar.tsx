"use client";

import { cn } from "@/lib/utils";
import { getRentalInvoicePaymentProgress } from "../mappers/rental-invoice-summary.mapper";
import type { RentalInvoiceResponse } from "../types";

type RentalInvoicePaymentProgressBarProps = {
  invoice: RentalInvoiceResponse;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(invoice: RentalInvoiceResponse): string {
  if (invoice.status === "VOID") {
    return "bg-destructive/60";
  }

  const progress = getRentalInvoicePaymentProgress(invoice);

  if (progress >= 100) {
    return "bg-success";
  }

  if (progress > 0) {
    return "bg-warning";
  }

  return "bg-muted-foreground/40";
}

export function RentalInvoicePaymentProgressBar({
  invoice,
  size = "sm",
  className,
}: RentalInvoicePaymentProgressBarProps) {
  const fillPercent = getRentalInvoicePaymentProgress(invoice);
  const barColor = resolveBarColor(invoice);

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
        aria-label={`Payment collected ${fillPercent}%`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
