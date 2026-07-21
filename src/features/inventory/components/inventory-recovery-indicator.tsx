"use client";

import { cn } from "@/lib/utils";
import type { InventoryRecoveryMetrics } from "../mappers/inventory-recovery.mapper";

type InventoryRecoveryIndicatorProps = {
  metrics: InventoryRecoveryMetrics;
  className?: string;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(amount);
}

function RecoveryProgressRing({
  percentage,
  isOverRecovered,
  size = 28,
}: {
  percentage: number;
  isOverRecovered: boolean;
  size?: number;
}) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-[stroke-dashoffset] duration-300",
            isOverRecovered ? "text-emerald-700" : "text-emerald-600",
          )}
        />
      </svg>
      {isOverRecovered ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-700 text-[9px] font-bold leading-none text-white"
          aria-hidden="true"
        >
          +
        </span>
      ) : null}
    </div>
  );
}

export function InventoryRecoveryIndicator({
  metrics,
  className,
}: InventoryRecoveryIndicatorProps) {
  if (!metrics.hasCostData) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>—</span>
    );
  }

  const displayPercentage = Math.round(metrics.percentage);
  const tooltip = metrics.isOverRecovered
    ? `${metrics.phaseLabel} — ${displayPercentage}% of purchase cost recovered (+${formatCurrency(metrics.surplusAmount)} beyond cost)`
    : `${metrics.phaseLabel} — ${displayPercentage}% of purchase cost recovered`;

  return (
    <div
      className={cn("flex min-w-[7.5rem] items-center gap-2.5", className)}
      title={tooltip}
    >
      <RecoveryProgressRing
        percentage={metrics.percentage}
        isOverRecovered={metrics.isOverRecovered}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            metrics.isOverRecovered ? "text-emerald-700" : "text-foreground",
          )}
        >
          {displayPercentage}%
        </p>
        <p
          className={cn(
            "truncate text-xs",
            metrics.isOverRecovered
              ? "font-medium text-emerald-700"
              : "text-muted-foreground",
          )}
        >
          {metrics.phaseLabel}
        </p>
      </div>
    </div>
  );
}
