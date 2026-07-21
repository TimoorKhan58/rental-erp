"use client";

import {
  AlertTriangleIcon,
  BoxesIcon,
  PackageCheckIcon,
  PackageXIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { InventorySummaryStats } from "../types";

type InventorySummaryCardsProps = {
  stats: InventorySummaryStats | undefined;
  isLoading?: boolean;
  className?: string;
};

type SummaryCardConfig = {
  id: keyof InventorySummaryStats;
  label: string;
  hint: string;
  icon: typeof BoxesIcon;
  iconClass: string;
  accentClass?: string;
};

const cardConfigs: SummaryCardConfig[] = [
  {
    id: "totalOnHand",
    label: "Total on hand",
    hint: "Units across all records",
    icon: BoxesIcon,
    iconClass: "bg-primary/12 text-primary",
  },
  {
    id: "totalAvailable",
    label: "Available",
    hint: "Ready for allocation",
    icon: PackageCheckIcon,
    iconClass: "bg-success-muted text-success",
  },
  {
    id: "lowStockCount",
    label: "Low stock",
    hint: "At or below reorder level",
    icon: AlertTriangleIcon,
    iconClass: "bg-warning-muted text-warning-foreground",
    accentClass: "border-warning/30",
  },
  {
    id: "outOfStockCount",
    label: "Out of stock",
    hint: "Zero available units",
    icon: PackageXIcon,
    iconClass: "bg-destructive/12 text-destructive",
    accentClass: "border-destructive/30",
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

  return (
    <Card
      className={cn(
        "group border-border/60 shadow-soft transition-all duration-200 hover:shadow-soft-md",
        config.accentClass,
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
              config.iconClass,
            )}
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
            {value.toLocaleString()}
          </p>
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventorySummaryCards({
  stats,
  isLoading,
  className,
}: InventorySummaryCardsProps) {
  if (isLoading) {
    return (
      <div
        className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
        aria-busy="true"
        aria-label="Loading inventory summary"
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
    <section aria-label="Inventory summary" className={className}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cardConfigs.map((config) => (
          <SummaryCard key={config.id} config={config} value={stats[config.id]} />
        ))}
      </div>
    </section>
  );
}
