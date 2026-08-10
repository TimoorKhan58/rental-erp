"use client";

import {
  BoxesIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  WrenchIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import type { AssetSummaryStats } from "../mappers/asset-summary.mapper";

type AssetSummaryCardsProps = {
  stats: AssetSummaryStats | undefined;
  isLoading?: boolean;
  className?: string;
};

type SummaryCardConfig = {
  id: keyof AssetSummaryStats;
  label: string;
  hint: string;
  icon: typeof BoxesIcon;
  iconClass: string;
  format?: (value: number) => string;
};

const cardConfigs: SummaryCardConfig[] = [
  {
    id: "totalAssets",
    label: "Total assets",
    hint: "All registered assets",
    icon: BoxesIcon,
    iconClass: "bg-primary/12 text-primary",
  },
  {
    id: "totalBookValue",
    label: "Book value",
    hint: "Current book value total",
    icon: CircleDollarSignIcon,
    iconClass: "bg-success-muted text-success",
    format: (value) => formatCurrency(value),
  },
  {
    id: "activeCount",
    label: "Active",
    hint: "In service",
    icon: CheckCircle2Icon,
    iconClass: "bg-info/12 text-info",
  },
  {
    id: "underMaintenanceCount",
    label: "Under maintenance",
    hint: "Temporarily offline",
    icon: WrenchIcon,
    iconClass: "bg-warning-muted text-warning-foreground",
  },
];

function SummaryCard({
  config,
  value,
}: {
  config: SummaryCardConfig;
  value: number;
}) {
  const Icon = config.icon;
  const display = config.format ? config.format(value) : value.toLocaleString();

  return (
    <Card className="group border-border/60 shadow-soft transition-all duration-200 hover:shadow-soft-md">
      <CardContent className="space-y-3 p-4">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
            config.iconClass,
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
            {display}
          </p>
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AssetSummaryCards({
  stats,
  isLoading,
  className,
}: AssetSummaryCardsProps) {
  if (isLoading) {
    return (
      <div
        className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
        aria-busy="true"
        aria-label="Loading asset summary"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/60">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <section aria-label="Asset summary" className={className}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cardConfigs.map((config) => (
          <SummaryCard key={config.id} config={config} value={stats[config.id]} />
        ))}
      </div>
    </section>
  );
}
