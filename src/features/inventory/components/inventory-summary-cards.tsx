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
    label: "On hand",
    hint: "Units across warehouses",
    icon: BoxesIcon,
    iconClass: "bg-primary/10 text-primary",
  },
  {
    id: "totalAvailable",
    label: "Available",
    hint: "Ready to allocate",
    icon: PackageCheckIcon,
    iconClass: "bg-success-muted text-success",
  },
  {
    id: "lowStockCount",
    label: "Shortage",
    hint: "At or below reorder level",
    icon: AlertTriangleIcon,
    iconClass: "bg-warning-muted text-warning-foreground",
    accentClass: "border-warning/35",
  },
  {
    id: "outOfStockCount",
    label: "Out",
    hint: "Zero available units",
    icon: PackageXIcon,
    iconClass: "bg-destructive/10 text-destructive",
    accentClass: "border-destructive/35",
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
  const needsAttention =
    (config.id === "lowStockCount" || config.id === "outOfStockCount") && value > 0;

  return (
    <Card
      className={cn(
        "border-border bg-card shadow-none",
        config.accentClass,
        needsAttention && "bg-muted/15",
      )}
    >
      <CardContent className="flex items-start gap-3 p-3.5">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            config.iconClass,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="font-heading text-xl font-semibold tracking-tight tabular-nums">
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
        className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}
        aria-busy="true"
        aria-label="Loading inventory summary"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border shadow-none">
            <CardContent className="flex items-start gap-3 p-3.5">
              <Skeleton className="size-8 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-4 w-20" />
              </div>
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cardConfigs.map((config) => (
          <SummaryCard key={config.id} config={config} value={stats[config.id]} />
        ))}
      </div>
    </section>
  );
}
