"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function ChartSkeleton() {
  return (
    <Skeleton className="h-64 w-full" aria-busy="true" aria-label="Loading chart" />
  );
}

export const TopProductsChart = dynamic(
  () => import("./dashboard-insights-charts").then((mod) => mod.TopProductsChart),
  { ssr: false, loading: ChartSkeleton },
);

export const UtilizationChart = dynamic(
  () => import("./dashboard-insights-charts").then((mod) => mod.UtilizationChart),
  { ssr: false, loading: ChartSkeleton },
);

export const ArAgingChart = dynamic(
  () => import("./dashboard-insights-charts").then((mod) => mod.ArAgingChart),
  { ssr: false, loading: ChartSkeleton },
);
