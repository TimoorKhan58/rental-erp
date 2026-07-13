"use client";

import { memo } from "react";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardMetric, FinancialSummaryItem } from "../types";
import { SecondaryMetricsRow } from "./kpi-grid";
import { DashboardWidget, DashboardWidgetSkeleton } from "./widgets";

const trendConfig = {
  up: { icon: ArrowUpIcon, className: "text-success" },
  down: { icon: ArrowDownIcon, className: "text-error" },
  neutral: { icon: MinusIcon, className: "text-muted-foreground" },
} as const;

type AssetUtilizationSectionProps = {
  financialItems: FinancialSummaryItem[];
  secondaryMetrics?: DashboardMetric[];
  isLoading?: boolean;
};

/**
 * Asset Utilization — financial snapshot plus secondary operational KPIs.
 * Preserves Financial Summary + metrics beyond the primary 4 KPI cards.
 */
export const AssetUtilizationSection = memo(function AssetUtilizationSection({
  financialItems,
  secondaryMetrics = [],
  isLoading,
}: AssetUtilizationSectionProps) {
  if (isLoading) {
    return (
      <DashboardWidgetSkeleton title="Loading asset utilization">
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`s-${index}`} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardWidgetSkeleton>
    );
  }

  return (
    <DashboardWidget
      title="Asset Utilization"
      description="Financial performance and operational load"
      contentClassName="space-y-3"
    >
      <div>
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Financial summary
        </p>
        <ul
          className="grid gap-2 sm:grid-cols-2"
          aria-label="Financial summary"
        >
          {financialItems.map((item) => {
            const trend = trendConfig[item.trend];
            const TrendIcon = trend.icon;

            return (
              <li
                key={item.id}
                className="rounded-lg border border-border/80 px-3 py-2"
              >
                <p className="font-sans text-xs text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-0.5 font-sans text-base font-semibold tracking-tight tabular-nums">
                  {item.value}
                </p>
                <p
                  className={cn(
                    "mt-0.5 flex items-center gap-1 font-sans text-xs",
                    trend.className,
                  )}
                >
                  <TrendIcon className="size-3" aria-hidden="true" />
                  <span>{item.changeLabel}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      {secondaryMetrics.length > 0 ? (
        <div>
          <p className="mb-2 font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Operations
          </p>
          <SecondaryMetricsRow metrics={secondaryMetrics} />
        </div>
      ) : null}
    </DashboardWidget>
  );
});

/** Alias kept for existing barrel imports. */
export const FinancialSummarySection = memo(function FinancialSummarySection({
  items,
  isLoading,
}: {
  items: FinancialSummaryItem[];
  isLoading?: boolean;
}) {
  return (
    <AssetUtilizationSection
      financialItems={items}
      isLoading={isLoading}
    />
  );
});
