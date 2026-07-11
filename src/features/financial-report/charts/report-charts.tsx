"use client";

import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactNumber, formatCurrency } from "@/lib/utils";
import { ReportChartContainer } from "../components/report-chart-container";

const CHART_COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type AmountBarChartProps = {
  title: string;
  description?: string;
  data: Array<{ label: string; value: number }>;
  isLoading?: boolean;
};

export const AmountBarChart = memo(function AmountBarChart({
  title,
  description,
  data,
  isLoading,
}: AmountBarChartProps) {
  if (isLoading) {
    return (
      <ReportChartContainer title={title} description="Loading chart data">
        <Skeleton className="h-full w-full" aria-busy="true" />
      </ReportChartContainer>
    );
  }

  return (
    <ReportChartContainer title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tickFormatter={(value) => formatCompactNumber(Number(value))}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
          <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ReportChartContainer>
  );
});

type StatusPieChartProps = {
  title: string;
  description?: string;
  data: Array<{ label: string; value: number }>;
  isLoading?: boolean;
};

export const StatusPieChart = memo(function StatusPieChart({
  title,
  description,
  data,
  isLoading,
}: StatusPieChartProps) {
  if (isLoading) {
    return (
      <ReportChartContainer title={title} description="Loading chart data">
        <Skeleton className="h-full w-full" aria-busy="true" />
      </ReportChartContainer>
    );
  }

  return (
    <ReportChartContainer title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ReportChartContainer>
  );
});
