"use client";

import { memo } from "react";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/design-system/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinancialSummaryItem } from "../types";

type FinancialSummarySectionProps = {
  items: FinancialSummaryItem[];
  isLoading?: boolean;
};

export const FinancialSummarySection = memo(function FinancialSummarySection({
  items,
  isLoading,
}: FinancialSummarySectionProps) {
  if (isLoading) {
    return (
      <SectionCard title="Financial Summary">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Financial Summary" description="Month-to-date financial snapshot">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <StatCard
            key={item.id}
            label={item.label}
            value={item.value}
            changeLabel={item.changeLabel}
            trend={item.trend}
          />
        ))}
      </div>
    </SectionCard>
  );
});
