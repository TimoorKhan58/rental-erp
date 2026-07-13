"use client";

import { memo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "../charts";
import { Skeleton } from "@/components/ui/skeleton";
import type { RentalTrendPoint } from "../types";

type RentalTrendsChartProps = {
  data: RentalTrendPoint[] | undefined;
  isLoading?: boolean;
};

export const RentalTrendsChart = memo(function RentalTrendsChart({
  data,
  isLoading,
}: RentalTrendsChartProps) {
  if (isLoading || !data) {
    return (
      <ChartContainer title="Rental Activity" description="Loading chart data">
        <Skeleton className="h-full w-full rounded-lg" aria-busy="true" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="Rental Activity"
      description="Active vs completed rentals by month"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            className="stroke-border/50"
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "none",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          />
          <Line
            type="monotone"
            dataKey="active"
            name="Active"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="var(--success)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});
