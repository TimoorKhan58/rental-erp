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
      <ChartContainer title="Rental Trends" description="Loading chart data">
        <Skeleton className="h-full w-full" aria-busy="true" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="Rental Trends"
      description="Active vs completed rentals by month"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="active"
            name="Active"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="var(--success)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});
