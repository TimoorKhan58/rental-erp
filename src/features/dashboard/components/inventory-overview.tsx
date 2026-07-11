"use client";

import { memo } from "react";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/design-system/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryOverviewItem } from "../types";

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
      <section aria-label="Inventory overview" aria-busy="true">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Inventory overview">
      <SectionCard
        title="Inventory Overview"
        description="Stock and asset availability snapshot"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <MetricCard
              key={item.id}
              label={item.label}
              value={item.value.toLocaleString("en-PK")}
              hint={item.description}
            />
          ))}
        </div>
      </SectionCard>
    </section>
  );
});
