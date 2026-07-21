"use client";

import { cn } from "@/lib/utils";
import { getReturnWorkflowProgress } from "../mappers/return-summary.mapper";
import type { ReturnStatus } from "../types";

type ReturnWorkflowProgressBarProps = {
  status: ReturnStatus;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(status: ReturnStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-success";
    case "INSPECTED":
      return "bg-warning";
    case "RECEIVED":
      return "bg-info";
    case "DRAFT":
      return "bg-muted-foreground/40";
    case "CANCELLED":
      return "bg-destructive/60";
  }
}

export function ReturnWorkflowProgressBar({
  status,
  size = "sm",
  className,
}: ReturnWorkflowProgressBarProps) {
  const fillPercent = getReturnWorkflowProgress(status);
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
        aria-label={`Return workflow ${fillPercent}% complete`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
