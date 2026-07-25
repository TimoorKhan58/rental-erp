"use client";

import { memo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactNumber, formatCurrency } from "@/lib/utils";
import { ReportChartContainer } from "@/features/financial-report/components/report-chart-container";
import type {
  RentalInsightsArAgingBucket,
  RentalInsightsProductLine,
  RentalInsightsUtilizationProductLine,
} from "../types/rental-insights.types";

const CHART_COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type ChartShellProps = {
  title: string;
  description?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
};

function ChartShell({
  title,
  description,
  isLoading,
  isEmpty,
  emptyMessage = "No data for this period.",
  children,
}: ChartShellProps) {
  if (isLoading) {
    return (
      <ReportChartContainer title={title} description="Loading chart data">
        <Skeleton className="h-full w-full" aria-busy="true" />
      </ReportChartContainer>
    );
  }

  if (isEmpty) {
    return (
      <ReportChartContainer title={title} description={description}>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      </ReportChartContainer>
    );
  }

  return (
    <ReportChartContainer title={title} description={description}>
      {children}
    </ReportChartContainer>
  );
}

type TopProductsChartProps = {
  title: string;
  description?: string;
  data: RentalInsightsProductLine[];
  valueKey: "revenue" | "quantityDays";
  isLoading?: boolean;
};

export const TopProductsChart = memo(function TopProductsChart({
  title,
  description,
  data,
  valueKey,
  isLoading,
}: TopProductsChartProps) {
  const chartData = data.map((line) => ({
    label: line.productCode,
    name: line.productName,
    value: line[valueKey],
  }));

  const isCurrency = valueKey === "revenue";
  const formatValue = (value: number) =>
    isCurrency ? formatCurrency(value) : formatCompactNumber(value);

  return (
    <ChartShell
      title={title}
      description={description}
      isLoading={isLoading}
      isEmpty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCompactNumber(Number(value))}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={72}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => formatValue(Number(value))}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { name?: string; label?: string } | undefined;
              return row?.name ? `${row.label} — ${row.name}` : (row?.label ?? "");
            }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
          <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
});

type UtilizationChartProps = {
  fleet: {
    onHand: number;
    reserved: number;
    available: number;
    utilizationPercent: number;
  };
  byProduct: RentalInsightsUtilizationProductLine[];
  isLoading?: boolean;
};

export const UtilizationChart = memo(function UtilizationChart({
  fleet,
  byProduct,
  isLoading,
}: UtilizationChartProps) {
  const chartData = byProduct.map((line) => ({
    label: line.productName,
    value: line.utilizationPercent,
    onHand: line.onHand,
    reserved: line.reserved,
  }));

  return (
    <ChartShell
      title="Fleet utilization"
      description="Reserved units as a share of on-hand stock"
      isLoading={isLoading}
      isEmpty={fleet.onHand === 0 && chartData.length === 0}
      emptyMessage="No rentable inventory on hand."
    >
      <div className="flex h-full flex-col gap-3">
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">On hand</dt>
            <dd className="font-semibold tabular-nums">{fleet.onHand}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reserved</dt>
            <dd className="font-semibold tabular-nums">{fleet.reserved}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Available</dt>
            <dd className="font-semibold tabular-nums">{fleet.available}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Utilization</dt>
            <dd className="font-semibold tabular-nums">{fleet.utilizationPercent}%</dd>
          </div>
        </dl>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={88}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(1)}%`}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartShell>
  );
});

type ArAgingChartProps = {
  buckets: RentalInsightsArAgingBucket[];
  totalOutstanding: number;
  isLoading?: boolean;
};

export const ArAgingChart = memo(function ArAgingChart({
  buckets,
  totalOutstanding,
  isLoading,
}: ArAgingChartProps) {
  const chartData = buckets.map((bucket) => ({
    label: bucket.label,
    value: bucket.balance,
    invoiceCount: bucket.invoiceCount,
  }));

  return (
    <ChartShell
      title="Accounts receivable aging"
      description={
        totalOutstanding > 0
          ? `${formatCurrency(totalOutstanding)} outstanding`
          : "Issued and partially paid invoices with balance due"
      }
      isLoading={isLoading}
      isEmpty={totalOutstanding <= 0}
      emptyMessage="No outstanding invoice balances."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={52}
          />
          <YAxis
            tickFormatter={(value) => formatCompactNumber(Number(value))}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const count = (item.payload as { invoiceCount?: number }).invoiceCount ?? 0;
              return [`${formatCurrency(Number(value))} (${count} invoices)`, "Balance"];
            }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
});
