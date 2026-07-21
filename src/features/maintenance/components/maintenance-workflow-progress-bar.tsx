"use client";

import { cn } from "@/lib/utils";
import { getMaintenanceWorkflowProgress } from "../mappers/maintenance-summary.mapper";
import type { MaintenanceStatus } from "../types";

type MaintenanceWorkflowProgressBarProps = {
  status: MaintenanceStatus;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(status: MaintenanceStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-success";
    case "IN_PROGRESS":
      return "bg-info";
    case "SCHEDULED":
      return "bg-muted-foreground/40";
    case "CANCELLED":
      return "bg-destructive/60";
  }
}

export function MaintenanceWorkflowProgressBar({
  status,
  size = "sm",
  className,
}: MaintenanceWorkflowProgressBarProps) {
  const fillPercent = getMaintenanceWorkflowProgress(status);
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
        aria-label={`Maintenance workflow ${fillPercent}% complete`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
