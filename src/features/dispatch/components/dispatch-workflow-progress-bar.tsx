"use client";

import { cn } from "@/lib/utils";
import { getDispatchWorkflowProgress } from "../mappers/dispatch-summary.mapper";
import type { DispatchStatus } from "../types";

type DispatchWorkflowProgressBarProps = {
  status: DispatchStatus;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(status: DispatchStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-success";
    case "DISPATCHED":
      return "bg-info";
    case "READY":
      return "bg-warning";
    case "DRAFT":
      return "bg-muted-foreground/40";
    case "CANCELLED":
      return "bg-destructive/60";
  }
}

export function DispatchWorkflowProgressBar({
  status,
  size = "sm",
  className,
}: DispatchWorkflowProgressBarProps) {
  const fillPercent = getDispatchWorkflowProgress(status);
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
        aria-label={`Delivery workflow ${fillPercent}% complete`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
