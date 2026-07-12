"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lazy chart entry points — keep recharts out of the initial financial-report route chunk.
 * Named exports match the eager chart components so page imports stay unchanged.
 */
function ChartSkeleton() {
  return (
    <Skeleton className="h-64 w-full" aria-busy="true" aria-label="Loading chart" />
  );
}

export const AmountBarChart = dynamic(
  () => import("./report-charts").then((mod) => mod.AmountBarChart),
  {
    ssr: false,
    loading: ChartSkeleton,
  },
);

export const StatusPieChart = dynamic(
  () => import("./report-charts").then((mod) => mod.StatusPieChart),
  {
    ssr: false,
    loading: ChartSkeleton,
  },
);
