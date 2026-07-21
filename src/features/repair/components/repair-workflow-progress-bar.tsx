"use client";

import { cn } from "@/lib/utils";
import { getRepairWorkflowProgress } from "../mappers/repair-summary.mapper";
import type { RepairStatus } from "../types";

type RepairWorkflowProgressBarProps = {
  status: RepairStatus;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(status: RepairStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-success";
    case "IN_PROGRESS":
      return "bg-info";
    case "PENDING":
      return "bg-muted-foreground/40";
    case "CANCELLED":
      return "bg-destructive/60";
  }
}

export function RepairWorkflowProgressBar({
  status,
  size = "sm",
  className,
}: RepairWorkflowProgressBarProps) {
  const fillPercent = getRepairWorkflowProgress(status);
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
        aria-label={`Repair workflow ${fillPercent}% complete`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
