"use client";

import Link from "next/link";
import { memo } from "react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ClipboardListIcon,
  CreditCardIcon,
  MinusIcon,
  PackageIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardMetric } from "../types";

const iconMap = {
  orders: ClipboardListIcon,
  payments: CreditCardIcon,
  inventory: PackageIcon,
} as const;

const trendConfig = {
  up: { icon: ArrowUpIcon, className: "text-success" },
  down: { icon: ArrowDownIcon, className: "text-destructive" },
  neutral: { icon: MinusIcon, className: "text-muted-foreground" },
} as const;

type BusinessPulseRowProps = {
  metrics: DashboardMetric[];
  isLoading?: boolean;
};

function PulseCard({ metric }: { metric: DashboardMetric }) {
  const Icon = iconMap[metric.icon as keyof typeof iconMap] ?? PackageIcon;
  const trend = trendConfig[metric.trend];
  const TrendIcon = trend.icon;

  const content = (
    <Card
      size="sm"
      className="group h-full gap-0 border-border bg-card py-0 transition-colors hover:bg-muted/30"
    >
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/8 text-primary">
            <Icon className="size-3.5" aria-hidden="true" />
          </div>
          <TrendIcon className={cn("size-3.5 shrink-0", trend.className)} aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          <p className="font-heading text-2xl font-semibold leading-none tracking-tight tabular-nums">
            {metric.value}
          </p>
          <p className="flex items-center gap-1 text-sm font-medium leading-snug text-foreground">
            {metric.label}
            {metric.href ? (
              <ArrowRightIcon
                className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
            ) : null}
          </p>
          <p className="text-[length:var(--text-caption)] leading-snug text-muted-foreground">
            {metric.subtitle}
          </p>
          <p className="line-clamp-1 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
            {metric.changeLabel}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        className="block h-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export const BusinessPulseRow = memo(function BusinessPulseRow({
  metrics,
  isLoading,
}: BusinessPulseRowProps) {
  if (isLoading) {
    return (
      <div
        className="app-grid [&>*]:sm:col-span-3 [&>*]:lg:col-span-3"
        aria-busy="true"
        aria-label="Loading business health"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} size="sm" className="gap-0 border-border py-0">
            <CardContent className="space-y-1.5 p-3">
              <Skeleton className="size-7 rounded-md" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Business health">
      <div className="mb-2">
        <h2 className="font-heading text-[length:var(--text-small)] font-semibold tracking-[0.06em] text-foreground uppercase">
          Business health
        </h2>
        <p className="text-[length:var(--text-caption)] text-muted-foreground">
          Revenue, cash, rentals, and collections
        </p>
      </div>
      <div className="app-grid [&>*]:sm:col-span-3 [&>*]:lg:col-span-3">
        {metrics.slice(0, 4).map((metric) => (
          <PulseCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
});
