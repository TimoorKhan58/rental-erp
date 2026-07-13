"use client";

import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryOverviewItem } from "../types";
import { DashboardWidget, DashboardWidgetSkeleton } from "./widgets";

type InventoryOverviewSectionProps = {
  items: InventoryOverviewItem[];
  isLoading?: boolean;
};

export const InventoryOverviewSection = memo(function InventoryOverviewSection({
  items,
  isLoading,
}: InventoryOverviewSectionProps) {
  if (isLoading) {
    return (
      <DashboardWidgetSkeleton title="Loading inventory health">
        <div
          className="grid gap-3 sm:grid-cols-2"
          aria-busy="true"
          aria-label="Inventory health"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </DashboardWidgetSkeleton>
    );
  }

  return (
    <DashboardWidget
      title="Inventory Health"
      description="Stock and asset availability snapshot"
    >
      <ul
        className="grid gap-2 sm:grid-cols-2"
        aria-label="Inventory health"
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-border/80 px-3 py-2"
          >
            <p className="font-sans text-xs font-medium text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-0.5 font-sans text-xl font-semibold tracking-tight tabular-nums text-foreground leading-none">
              {item.value.toLocaleString("en-PK")}
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  );
});
