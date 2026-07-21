"use client";

import { memo } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClipboardListIcon,
  CreditCardIcon,
  MinusIcon,
  PackageIcon,
  UsersIcon,
  WrenchIcon,
  Building2Icon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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

const iconColorMap: Record<string, string> = {
  orders: "bg-muted text-foreground",
  product: "bg-success-muted text-success",
  users: "bg-muted text-foreground",
  company: "bg-muted text-foreground",
  payments: "bg-success-muted text-success",
  maintenance: "bg-warning-muted text-warning-foreground",
  repairs: "bg-warning-muted text-warning-foreground",
  inventory: "bg-muted text-foreground",
};

const trendConfig = {
  up: { icon: ArrowUpIcon, className: "text-success" },
  down: { icon: ArrowDownIcon, className: "text-destructive" },
  neutral: { icon: MinusIcon, className: "text-muted-foreground" },
} as const;

type FeaturedKpiRowProps = {
  metrics: DashboardMetric[];
  isLoading?: boolean;
};

function FeaturedKpiCard({ metric }: { metric: DashboardMetric }) {
  const Icon = iconMap[metric.icon as keyof typeof iconMap] ?? PackageIcon;
  const iconColor = iconColorMap[metric.icon] ?? "bg-primary/12 text-primary";
  const trend = trendConfig[metric.trend];
  const TrendIcon = trend.icon;

  return (
    <Card className="group border-border bg-card shadow-soft transition-all duration-200 hover:shadow-soft-md">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
              iconColor,
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className={cn("flex items-center gap-1 text-xs font-medium", trend.className)}>
            <TrendIcon className="size-3.5" aria-hidden="true" />
            <span className="line-clamp-1">{metric.changeLabel}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-heading text-3xl font-semibold tracking-tight">{metric.value}</p>
          <p className="text-sm font-medium text-foreground">{metric.label}</p>
          <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export const FeaturedKpiRow = memo(function FeaturedKpiRow({
  metrics,
  isLoading,
}: FeaturedKpiRowProps) {
  if (isLoading) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-busy="true"
        aria-label="Loading featured metrics"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/60">
            <CardContent className="space-y-4 p-5">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Featured metrics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.slice(0, 4).map((metric) => (
          <FeaturedKpiCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
});
