"use client";

import { memo } from "react";
import {
  ClipboardListIcon,
  CreditCardIcon,
  PackageIcon,
  UsersIcon,
  WrenchIcon,
  Building2Icon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { SparklinePlaceholder } from "../charts";
import type { DashboardMetric } from "../types";

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

type DashboardMetricCardProps = {
  metric: DashboardMetric;
};

export const DashboardMetricCard = memo(function DashboardMetricCard({
  metric,
}: DashboardMetricCardProps) {
  const Icon = iconMap[metric.icon as keyof typeof iconMap] ?? PackageIcon;

  return (
    <Card className="border-border/80 shadow-token-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
        <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{metric.changeLabel}</span>
        </div>
        <SparklinePlaceholder />
      </CardContent>
    </Card>
  );
});

export function DashboardMetricCardSkeleton() {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

type KpiGridProps = {
  metrics: DashboardMetric[];
  isLoading?: boolean;
};

export const KpiGrid = memo(function KpiGrid({ metrics, isLoading }: KpiGridProps) {
  if (isLoading) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy="true"
        aria-label="Loading KPI metrics"
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <DashboardMetricCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Key performance indicators">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
});

/** Compact stat row using StatCard for financial summary style sections */
export const DashboardStatRow = memo(function DashboardStatRow({
  metrics,
}: {
  metrics: DashboardMetric[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.slice(0, 4).map((metric) => (
        <StatCard
          key={metric.id}
          label={metric.label}
          value={metric.value}
          changeLabel={metric.changeLabel}
          trend={metric.trend}
        />
      ))}
    </div>
  );
});
