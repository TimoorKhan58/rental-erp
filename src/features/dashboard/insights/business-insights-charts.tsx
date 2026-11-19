"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactNumber, formatCurrency, formatNumber } from "@/lib/utils";

import { WEEKDAY_SHORT, hourLabel } from "./derive-insights";

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  fontSize: 12,
};
const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };
const MUTED_BAR = "var(--viz-heat-1)";

export type MonthPoint = {
  label: string;
  booked: number;
  collected: number;
  expenses: number;
};

/** Booked sales (bars) with cash collected and expenses (lines), same money axis. */
export function MoneyTrendChart({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(value) => formatCompactNumber(Number(value))}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          formatter={(value, name) => [formatCurrency(Number(value)), name]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="booked" name="Sales booked" fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line dataKey="collected" name="Cash collected" stroke="var(--viz-2)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line dataKey="expenses" name="Expenses" stroke="var(--viz-3)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export type BarPoint = {
  label: string;
  value: number;
  /** Optional longer name for the tooltip. */
  name?: string;
};

/**
 * One measure across categories. The highest bar is drawn in the strong
 * colour so the peak reads at a glance; the rest stay quiet.
 */
export function PeakBarChart({
  data,
  valueLabel,
  format = "number",
  highlightPeak = true,
}: {
  data: BarPoint[];
  valueLabel: string;
  format?: "number" | "currency" | "percent";
  highlightPeak?: boolean;
}) {
  const max = Math.max(0, ...data.map((point) => point.value));
  const show = (value: number) =>
    format === "currency"
      ? formatCurrency(value)
      : format === "percent"
        ? `${formatNumber(value)}%`
        : formatNumber(value);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={40}
          allowDecimals={false}
          tickFormatter={(value) => (format === "percent" ? `${value}%` : formatCompactNumber(Number(value)))}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          labelFormatter={(label, payload) => {
            const row = payload?.[0]?.payload as BarPoint | undefined;
            return row?.name ?? String(label);
          }}
          formatter={(value) => [show(Number(value)), valueLabel]}
        />
        <Bar dataKey="value" name={valueLabel} radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((point, index) => (
            <Cell
              key={index}
              fill={!highlightPeak || (point.value === max && max > 0) ? "var(--viz-1)" : MUTED_BAR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Ranked list as horizontal bars (items, customers, payment methods). */
export function RankedBarChart({
  data,
  valueLabel,
  format = "number",
}: {
  data: BarPoint[];
  valueLabel: string;
  format?: "number" | "currency" | "percent";
}) {
  const show = (value: number) =>
    format === "currency"
      ? formatCurrency(value)
      : format === "percent"
        ? `${formatNumber(value)}%`
        : formatNumber(value);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barCategoryGap={4}>
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => (format === "percent" ? `${value}%` : formatCompactNumber(Number(value)))}
        />
        <YAxis type="category" dataKey="label" width={124} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          labelFormatter={(label, payload) => {
            const row = payload?.[0]?.payload as BarPoint | undefined;
            return row?.name ?? String(label);
          }}
          formatter={(value) => [show(Number(value)), valueLabel]}
        />
        <Bar dataKey="value" name={valueLabel} fill="var(--viz-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export type CustomerMixPoint = {
  label: string;
  returning: number;
  fresh: number;
};

/** New and returning customers per month, stacked. */
export function CustomerMixChart({ data }: { data: CustomerMixPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="returning" name="Returning" stackId="c" fill="var(--viz-1)" stroke="var(--card)" strokeWidth={2} maxBarSize={28} />
        <Bar dataKey="fresh" name="New" stackId="c" fill="var(--viz-3)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const HEAT_STEPS = [
  "var(--viz-heat-0)",
  "var(--viz-heat-1)",
  "var(--viz-heat-2)",
  "var(--viz-heat-3)",
  "var(--viz-heat-4)",
];

/** Weekday × hour grid of when orders are entered; darker = more orders. */
export function EntryHeatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(0, ...grid.flat());
  // Show the working part of the day; quiet night hours are folded away.
  const activeHours = Array.from({ length: 24 }, (_, hour) => hour).filter((hour) =>
    grid.some((row) => (row[hour] ?? 0) > 0),
  );
  const first = activeHours.length > 0 ? Math.min(7, activeHours[0]!) : 7;
  const last = activeHours.length > 0 ? Math.max(22, activeHours.at(-1)!) : 22;
  const hours = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const step = (count: number) =>
    count === 0 || max === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 2 }} aria-label="Orders entered by day and hour">
        <thead>
          <tr>
            <th className="w-10" />
            {hours.map((hour) => (
              <th key={hour} scope="col" className="px-0 text-center text-[10px] font-normal text-muted-foreground">
                {hour % 3 === 0 ? hourLabel(hour).replace(" ", "") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, weekday) => (
            <tr key={weekday}>
              <th scope="row" className="pr-1 text-left text-[11px] font-normal text-muted-foreground">
                {WEEKDAY_SHORT[weekday]}
              </th>
              {hours.map((hour) => {
                const count = row[hour] ?? 0;
                return (
                  <td
                    key={hour}
                    title={`${WEEKDAY_SHORT[weekday]} ${hourLabel(hour)}: ${count} order${count === 1 ? "" : "s"}`}
                    className="h-5 min-w-4 rounded-[3px]"
                    style={{ background: HEAT_STEPS[step(count)] }}
                  >
                    <span className="sr-only">{count}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>Fewer</span>
        {HEAT_STEPS.map((color) => (
          <span key={color} className="inline-block size-3 rounded-[3px]" style={{ background: color }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
