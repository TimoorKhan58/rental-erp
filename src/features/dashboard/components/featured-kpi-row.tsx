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
  orders: "bg-primary/8 text-primary ring-1 ring-primary/10",
  product: "bg-brand-muted text-brand ring-1 ring-brand/15",
  users: "bg-info-muted text-info ring-1 ring-info/15",
  company: "bg-muted text-foreground ring-1 ring-border",
  payments: "bg-success-muted text-success ring-1 ring-success/15",
  maintenance: "bg-warning-muted text-warning ring-1 ring-warning/15",
  repairs: "bg-warning-muted text-warning ring-1 ring-warning/15",
  inventory: "bg-brand-muted text-brand ring-1 ring-brand/15",
};

const trendConfig = {
  up: { icon: ArrowUpIcon, className: "text-success bg-success-muted/60" },
  down: { icon: ArrowDownIcon, className: "text-destructive bg-destructive/10" },
  neutral: { icon: MinusIcon, className: "text-muted-foreground bg-muted" },
} as const;

type FeaturedKpiRowProps = {
  metrics: DashboardMetric[];
  isLoading?: boolean;
};

function FeaturedKpiCard({ metric }: { metric: DashboardMetric }) {
  const Icon = iconMap[metric.icon as keyof typeof iconMap] ?? PackageIcon;
  const iconColor = iconColorMap[metric.icon] ?? "bg-brand-muted text-brand ring-1 ring-brand/15";
  const trend = trendConfig[metric.trend];
  const TrendIcon = trend.icon;

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card shadow-soft transition-all duration-200 hover:border-border hover:shadow-soft-md">
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand/0 via-brand/60 to-brand/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      />
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
              iconColor,
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
          </div>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend.className,
            )}
          >
            <TrendIcon className="size-3" aria-hidden="true" />
            <span className="line-clamp-1">{metric.changeLabel}</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="font-heading text-[1.75rem] font-semibold tracking-tight tabular-nums">
            {metric.value}
          </p>
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
