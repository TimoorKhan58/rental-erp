"use client";

import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "../charts";
import { formatCompactNumber } from "@/lib/utils";
import type { RevenueOverview } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

type RevenueChartProps = {
  data: RevenueOverview | undefined;
  isLoading?: boolean;
};

function formatTooltipValue(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(value);
  return `PKR ${formatCompactNumber(numeric)}`;
}

export const RevenueChart = memo(function RevenueChart({
  data,
  isLoading,
}: RevenueChartProps) {
  if (isLoading || !data) {
    return (
      <ChartContainer title="Revenue Trend" description="Loading chart data">
        <Skeleton className="h-full w-full rounded-lg" aria-busy="true" />
      </ChartContainer>
    );
  }

  const changeLabel =
    data.changePercent >= 0
      ? `+${data.changePercent}%`
      : `${data.changePercent}%`;

  return (
    <ChartContainer
      title="Revenue Trend"
      description={`${data.period} · PKR ${formatCompactNumber(data.total)} · ${changeLabel}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            className="stroke-border/50"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatCompactNumber(Number(value))}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => formatTooltipValue(Number(value))}
            cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "none",
            }}
          />
          <Bar
            dataKey="value"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            aria-label="Monthly revenue"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});
