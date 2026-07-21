"use client";

import { cn } from "@/lib/utils";
import { getPaymentWorkflowProgress } from "../mappers/payment-summary.mapper";
import type { PaymentStatus } from "../types";

type PaymentWorkflowProgressBarProps = {
  status: PaymentStatus;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(status: PaymentStatus): string {
  switch (status) {
    case "POSTED":
      return "bg-success";
    case "PENDING":
      return "bg-muted-foreground/40";
    case "VOID":
      return "bg-destructive/60";
  }
}

export function PaymentWorkflowProgressBar({
  status,
  size = "sm",
  className,
}: PaymentWorkflowProgressBarProps) {
  const fillPercent = getPaymentWorkflowProgress(status);
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
        aria-label={`Payment workflow ${fillPercent}% complete`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
