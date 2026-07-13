"use client";

import { memo } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Building2Icon,
  ClipboardListIcon,
  CreditCardIcon,
  MinusIcon,
  PackageIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardMetric, DashboardTrend } from "../types";
import { DashboardCol, DashboardGrid } from "./widgets";

const iconMap = {
  orders: ClipboardListIcon,
  product: PackageIcon,
  users: UsersIcon,
  company: Building2Icon,
  payments: CreditCardIcon,
  maintenance: WrenchIcon,
  repairs: WrenchIcon,
  inventory: PackageIcon,
} as const;

const trendConfig: Record<
  DashboardTrend,
  { icon: typeof ArrowUpIcon; className: string }
> = {
  up: { icon: ArrowUpIcon, className: "text-success" },
  down: { icon: ArrowDownIcon, className: "text-error" },
  neutral: { icon: MinusIcon, className: "text-muted-foreground" },
};

/** Primary KPIs shown in the top row (4 cards). */
export const PRIMARY_KPI_COUNT = 4;

type DashboardMetricCardProps = {
  metric: DashboardMetric;
};

export const DashboardMetricCard = memo(function DashboardMetricCard({
  metric,
}: DashboardMetricCardProps) {
  const Icon = iconMap[metric.icon as keyof typeof iconMap] ?? PackageIcon;
  const trend = trendConfig[metric.trend];
  const TrendIcon = trend.icon;

  return (
    <Card className="gap-0 rounded-lg border border-border bg-card py-0 shadow-none">
      <CardContent className="flex flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-sans text-xs font-medium text-muted-foreground">
            {metric.label}
          </p>
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="font-sans text-2xl font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {metric.value}
        </p>
        <p className="font-sans text-xs text-muted-foreground">{metric.subtitle}</p>
        <div
          className={cn(
            "flex items-center gap-1 font-sans text-xs",
            trend.className,
          )}
        >
          <TrendIcon className="size-3 shrink-0" aria-hidden="true" />
          <span>{metric.changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
});

export function DashboardMetricCardSkeleton() {
  return (
    <Card className="gap-0 rounded-lg border border-border bg-card py-0 shadow-none">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="size-3.5" />
        </div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

type KpiGridProps = {
  metrics: DashboardMetric[];
  isLoading?: boolean;
  /** When set, only the first N metrics are rendered (primary row). */
  limit?: number;
};

export const KpiGrid = memo(function KpiGrid({
  metrics,
  isLoading,
  limit = PRIMARY_KPI_COUNT,
}: KpiGridProps) {
  const visible = metrics.slice(0, limit);

  if (isLoading) {
    return (
      <section aria-busy="true" aria-label="Loading KPI metrics">
        <DashboardGrid>
          {Array.from({ length: limit }).map((_, index) => (
            <DashboardCol key={index} span={3}>
              <DashboardMetricCardSkeleton />
            </DashboardCol>
          ))}
        </DashboardGrid>
      </section>
    );
  }

  return (
    <section aria-label="Key performance indicators">
      <DashboardGrid>
        {visible.map((metric) => (
          <DashboardCol key={metric.id} span={3}>
            <DashboardMetricCard metric={metric} />
          </DashboardCol>
        ))}
      </DashboardGrid>
    </section>
  );
});

/** Compact secondary metrics for Asset Utilization. */
export const SecondaryMetricsRow = memo(function SecondaryMetricsRow({
  metrics,
}: {
  metrics: DashboardMetric[];
}) {
  if (metrics.length === 0) return null;

  return (
    <ul
      className="grid gap-2 sm:grid-cols-2"
      aria-label="Additional performance metrics"
    >
      {metrics.map((metric) => {
        const trend = trendConfig[metric.trend];
        const TrendIcon = trend.icon;

        return (
          <li
            key={metric.id}
            className="rounded-lg border border-border/80 px-3 py-2"
          >
            <p className="font-sans text-xs text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 font-sans text-lg font-semibold tracking-tight tabular-nums">
              {metric.value}
            </p>
            <p
              className={cn(
                "mt-1 flex items-center gap-1 font-sans text-xs",
                trend.className,
              )}
            >
              <TrendIcon className="size-3" aria-hidden="true" />
              <span>{metric.changeLabel}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
});

/** Compact stat row using StatCard for financial summary style sections */
export const DashboardStatRow = memo(function DashboardStatRow({
  metrics,
}: {
  metrics: DashboardMetric[];
}) {
  return (
    <DashboardGrid>
      {metrics.slice(0, 4).map((metric) => (
        <DashboardCol key={metric.id} span={3}>
          <DashboardMetricCard metric={metric} />
        </DashboardCol>
      ))}
    </DashboardGrid>
  );
});
