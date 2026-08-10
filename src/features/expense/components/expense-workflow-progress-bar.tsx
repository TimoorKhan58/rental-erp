"use client";

import { cn } from "@/lib/utils";
import { getExpenseWorkflowProgress } from "../mappers/expense-summary.mapper";
import type { ExpenseStatus } from "../types";

type ExpenseWorkflowProgressBarProps = {
  status: ExpenseStatus;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(status: ExpenseStatus): string {
  switch (status) {
    case "PAID":
    case "APPROVED":
      return "bg-success";
    case "SUBMITTED":
      return "bg-warning";
    case "DRAFT":
      return "bg-muted-foreground/40";
    case "REJECTED":
      return "bg-destructive/60";
  }
}

export function ExpenseWorkflowProgressBar({
  status,
  size = "sm",
  className,
}: ExpenseWorkflowProgressBarProps) {
  const fillPercent = getExpenseWorkflowProgress(status);
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
        aria-label={`Expense workflow ${fillPercent}% complete`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${Math.max(fillPercent, status === "REJECTED" ? 100 : 0)}%` }}
        />
      </div>
    </div>
  );
}
