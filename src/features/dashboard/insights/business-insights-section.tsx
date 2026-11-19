"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Lightbulb, TriangleAlert } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyticsPermissions } from "@/features/analytics/hooks";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

import type {
  BusinessInsights,
  BusinessInsightsPeriodMonths,
  BusinessInsightsProduct,
  InsightBucket,
} from "./business-insights.types";
import {
  MONTH_SHORT,
  WEEKDAY_SHORT,
  deriveInsights,
  hourLabel,
  type InsightCard,
} from "./derive-insights";
import { useBusinessInsights } from "./use-business-insights";

function ChartSkeleton() {
  return <Skeleton className="h-full w-full" aria-busy="true" aria-label="Loading chart" />;
}

const MoneyTrendChart = dynamic(() => import("./business-insights-charts").then((m) => m.MoneyTrendChart), { ssr: false, loading: ChartSkeleton });
const PeakBarChart = dynamic(() => import("./business-insights-charts").then((m) => m.PeakBarChart), { ssr: false, loading: ChartSkeleton });
const RankedBarChart = dynamic(() => import("./business-insights-charts").then((m) => m.RankedBarChart), { ssr: false, loading: ChartSkeleton });
const CustomerMixChart = dynamic(() => import("./business-insights-charts").then((m) => m.CustomerMixChart), { ssr: false, loading: ChartSkeleton });
const EntryHeatmap = dynamic(() => import("./business-insights-charts").then((m) => m.EntryHeatmap), { ssr: false, loading: ChartSkeleton });

const PERIODS: BusinessInsightsPeriodMonths[] = [3, 6, 12, 24];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};

/** Chart label for an item: the first name part ("Foam Chair / ..."), kept short. */
export function shortItemName(name: string): string {
  const first = name.split(" / ")[0]!.trim() || name;
  return first.length > 18 ? `${first.slice(0, 17)}…` : first;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_SHORT[Number(month) - 1]} ${year?.slice(2)}`;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Panel({
  title,
  description,
  children,
  chartHeight = "h-60",
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  chartHeight?: string | null;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn("min-w-0 rounded-md border border-border bg-card p-4", className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      <div className={cn("mt-3 w-full min-w-0", chartHeight)}>{children}</div>
    </section>
  );
}

function Empty({ children = "Not enough records yet for this period." }: { children?: ReactNode }) {
  return (
    <div className="flex h-full min-h-24 items-center justify-center rounded-md bg-muted/40 px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  change,
  note,
  invert = false,
}: {
  label: string;
  value: string;
  change?: number | null;
  note?: string;
  /** For costs, going down is good. */
  invert?: boolean;
}) {
  const hasChange = change !== undefined && change !== null;
  const up = hasChange && change >= 0;
  const good = hasChange && (invert ? !up : up);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
      {hasChange ? (
        <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", good ? "text-success" : "text-destructive")}>
          {up ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
          {up ? "Up" : "Down"} {formatNumber(Math.abs(change))}% on the period before
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">{note ?? "No earlier period to compare"}</span>
      )}
    </div>
  );
}

const TONE_STYLE: Record<InsightCard["tone"], { icon: typeof Info; label: string; className: string }> = {
  good: { icon: Lightbulb, label: "Going well", className: "border-success/40 bg-success/5 text-success" },
  watch: { icon: TriangleAlert, label: "Needs attention", className: "border-warning/50 bg-warning-muted text-warning-foreground" },
  info: { icon: Info, label: "Good to know", className: "border-info/40 bg-info/5 text-info" },
};

function InsightCards({ cards }: { cards: InsightCard[] }) {
  if (cards.length === 0) {
    return <Empty>Insights appear here once you have a few weeks of orders.</Empty>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const tone = TONE_STYLE[card.tone];
        const Icon = tone.icon;
        return (
          <li key={card.id} className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-card p-3">
            <span className={cn("inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tone.className)}>
              <Icon className="size-3" aria-hidden />
              {tone.label}
            </span>
            <p className="text-sm font-semibold text-foreground">{card.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{card.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}

function bucketBars(buckets: InsightBucket[]) {
  return buckets.map((bucket) => ({ label: bucket.label, value: bucket.orders }));
}

function hasOrders(buckets: Array<{ orders: number }>) {
  return buckets.some((bucket) => bucket.orders > 0);
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function OverviewTab({ data, cards }: { data: BusinessInsights; cards: InsightCard[] }) {
  const { headline } = data;
  const trend = data.monthly.map((month) => ({
    label: monthLabel(month.month),
    booked: month.bookedValue,
    collected: month.collected,
    expenses: month.expenses,
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Sales booked" value={formatCurrency(headline.bookedValue.current)} change={headline.bookedValue.changePercent} />
        <Stat label="Orders" value={formatNumber(headline.orders.current)} change={headline.orders.changePercent} />
        <Stat label="Average order" value={formatCurrency(headline.averageOrderValue.current)} change={headline.averageOrderValue.changePercent} />
        <Stat label="Cash collected" value={formatCurrency(headline.collected.current)} change={headline.collected.changePercent} />
        <Stat label="Customers served" value={formatNumber(headline.activeCustomers.current)} change={headline.activeCustomers.changePercent} />
        <Stat label="Expenses" value={formatCurrency(headline.expenses.current)} change={headline.expenses.changePercent} invert />
      </div>
      <Panel title="Sales, cash and expenses by month" description="Bars are orders booked in the month; lines are cash received and expenses paid.">
        {trend.some((point) => point.booked > 0 || point.collected > 0 || point.expenses > 0) ? (
          <MoneyTrendChart data={trend} />
        ) : (
          <Empty />
        )}
      </Panel>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">What the numbers say</h3>
        <InsightCards cards={cards} />
      </div>
    </div>
  );
}

function SeasonsTab({ data }: { data: BusinessInsights }) {
  const { seasons } = data;
  const enough = seasons.totalOrders > 0;
  const seasonNote = `Based on ${formatNumber(seasons.totalOrders)} events in the last 2 years.`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Peak months" description={`Events by the month they start. ${seasonNote}`}>
          {enough ? (
            <PeakBarChart
              valueLabel="Events"
              data={seasons.byMonthOfYear.map((value) => ({ label: MONTH_SHORT[value.key - 1]!, value: value.orders }))}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Peak quarters" description="Events per quarter of the year (Q1 = Jan–Mar).">
          {enough ? (
            <PeakBarChart
              valueLabel="Events"
              data={seasons.byQuarter.map((value) => ({ label: `Q${value.key}`, value: value.orders }))}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Peak event days" description="The weekday events start on: plan loading and deliveries around it.">
          {enough ? (
            <PeakBarChart
              valueLabel="Events"
              data={seasons.byEventWeekday.map((value) => ({ label: WEEKDAY_SHORT[value.key]!, value: value.orders }))}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Peak booking hours" description={`When orders are entered (${data.timeZone} time).`}>
          {hasOrders(seasons.byEntryHour) ? (
            <PeakBarChart
              valueLabel="Orders entered"
              data={seasons.byEntryHour.map((value) => ({ label: hourLabel(value.key), value: value.orders }))}
            />
          ) : (
            <Empty />
          )}
        </Panel>
      </div>
      <Panel title="Busiest times of the week" description="Each square is one hour of one day; darker means more orders entered then." chartHeight={null}>
        {hasOrders(seasons.byEntryHour) ? <EntryHeatmap grid={seasons.entryHeatmap} /> : <Empty />}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="How far ahead customers book" description="Days between taking the order and the event.">
          {hasOrders(data.leadTime) ? <PeakBarChart valueLabel="Orders" data={bucketBars(data.leadTime)} /> : <Empty />}
        </Panel>
        <Panel title="How long rentals last" description="Event length in days, from start to end.">
          {hasOrders(data.rentalLength) ? <PeakBarChart valueLabel="Orders" data={bucketBars(data.rentalLength)} /> : <Empty />}
        </Panel>
      </div>
    </div>
  );
}

function ProductTable({ products }: { products: BusinessInsightsProduct[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 text-right font-medium">You own</th>
            <th className="py-2 pr-3 text-right font-medium">Rented out</th>
            <th className="py-2 pr-3 text-right font-medium">Sales</th>
            <th className="py-2 pr-3 text-right font-medium">Per item owned</th>
            <th className="py-2 pr-3 text-right font-medium">Time on rent</th>
            <th className="py-2 pr-3 text-right font-medium">Paid back</th>
            <th className="py-2 pr-3 text-right font-medium">Hired in</th>
            <th className="py-2 text-right font-medium">Damaged / lost</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.productId} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-3">
                <span className="font-medium">{product.name}</span>
                <span className="ml-1 text-xs text-muted-foreground">{product.code}</span>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(product.unitsOwned)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(product.quantity)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(product.revenue)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(product.revenuePerUnit)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {product.utilizationPercent === null ? "—" : `${formatNumber(product.utilizationPercent)}%`}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {product.paybackPercent === null ? "—" : `${formatNumber(product.paybackPercent)}%`}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {product.hireInTimes > 0 ? `${formatNumber(product.hireInQuantity)} (${formatNumber(product.hireInTimes)}×)` : "—"}
              </td>
              <td className="py-2 text-right tabular-nums">
                {product.damageLossPercent === null ? "—" : `${formatNumber(product.damageLossPercent)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockTab({ data }: { data: BusinessInsights }) {
  const top = (key: "quantity" | "revenuePerUnit" | "utilizationPercent") =>
    [...data.products]
      .filter((product) => (product[key] ?? 0) > 0)
      .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
      .slice(0, 8)
      .map((product) => ({ label: shortItemName(product.name), name: product.name, value: product[key] ?? 0 }));
  const byVolume = top("quantity");
  const byYield = top("revenuePerUnit");
  const byUse = top("utilizationPercent");
  const hiredIn = data.products
    .filter((product) => product.hireInQuantity > 0)
    .sort((a, b) => b.hireInQuantity - a.hireInQuantity)
    .slice(0, 8)
    .map((product) => ({ label: shortItemName(product.name), name: product.name, value: product.hireInQuantity }));
  const categories = data.categories.slice(0, 8).map((category) => ({ label: category.name, value: category.revenue }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Most rented items (by volume)" description="Items sent out in orders booked in this period.">
          {byVolume.length > 0 ? <RankedBarChart valueLabel="Items rented" data={byVolume} /> : <Empty />}
        </Panel>
        <Panel title="Earnings per item you own" description="Sales divided by how many you own. Buy more of the top ones.">
          {byYield.length > 0 ? <RankedBarChart valueLabel="Sales per item" format="currency" data={byYield} /> : <Empty />}
        </Panel>
        <Panel title="Time on rent" description="Share of days your items were out with customers. Low means stock is sitting idle.">
          {byUse.length > 0 ? <RankedBarChart valueLabel="Time on rent" format="percent" data={byUse} /> : <Empty />}
        </Panel>
        <Panel title="Items hired from suppliers" description="When you ran short and hired in. Regular hiring is a sign to buy your own.">
          {hiredIn.length > 0 ? <RankedBarChart valueLabel="Items hired in" data={hiredIn} /> : <Empty>You did not need to hire from suppliers in this period.</Empty>}
        </Panel>
      </div>
      <Panel title="Sales by category" chartHeight="h-52">
        {categories.length > 0 ? <RankedBarChart valueLabel="Sales" format="currency" data={categories} /> : <Empty />}
      </Panel>
      <Panel
        title="Every item at a glance"
        description="“Paid back” compares sales in this period with what the items cost to buy."
        chartHeight={null}
      >
        {data.products.length > 0 ? <ProductTable products={data.products} /> : <Empty />}
      </Panel>
    </div>
  );
}

function CustomersTab({ data }: { data: BusinessInsights }) {
  const { customers } = data;
  const mix = data.monthly.map((month) => ({
    label: monthLabel(month.month),
    returning: month.returningCustomers,
    fresh: month.newCustomers,
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Customers served" value={formatNumber(customers.activeCount)} note="In this period" />
        <Stat label="New customers" value={formatNumber(customers.newCount)} note="First order ever" />
        <Stat label="Returning customers" value={formatNumber(customers.returningCount)} note="Ordered before" />
        <Stat label="Came back" value={`${formatNumber(customers.repeatPercent)}%`} note="Share who are returning" />
        <Stat label="Top 5 share of sales" value={`${formatNumber(customers.top5SharePercent)}%`} note="Above 50% is a risk" />
        <Stat label="Average per customer" value={formatCurrency(customers.averageValuePerCustomer)} note="Sales ÷ customers" />
      </div>
      <Panel title="New and returning customers by month">
        {mix.some((point) => point.returning + point.fresh > 0) ? <CustomerMixChart data={mix} /> : <Empty />}
      </Panel>
      <Panel title="Top customers" description="By sales booked in this period." chartHeight={null}>
        {customers.top.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 text-right font-medium">Orders</th>
                  <th className="py-2 pr-3 text-right font-medium">Sales</th>
                  <th className="py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {customers.top.map((customer) => (
                  <tr key={customer.customerId} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{customer.name}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{customer.code}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(customer.orders)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(customer.bookedValue)}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(customer.sharePercent)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
    </div>
  );
}

function MoneyTab({ data }: { data: BusinessInsights }) {
  const { money } = data;
  const methods = money.paymentMethods.map((method) => ({
    label: PAYMENT_METHOD_LABELS[method.method] ?? method.method,
    value: method.amount,
  }));
  const aging = money.aging.map((bucket) => ({ label: bucket.label, value: bucket.amount }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Invoiced" value={formatCurrency(money.billed)} note="Invoices dated in this period" />
        <Stat label="Cash collected" value={formatCurrency(money.collected)} note="Payments received" />
        <Stat
          label="Invoices paid"
          value={money.collectionPercent === null ? "—" : `${formatNumber(money.collectionPercent)}%`}
          note="Of this period's invoices"
        />
        <Stat
          label="Days to get paid"
          value={money.averageDaysToPay === null ? "—" : formatNumber(money.averageDaysToPay)}
          note="Average, invoice to payment"
        />
        <Stat label="Still owed" value={formatCurrency(money.outstanding)} note="All open invoices" />
        <Stat label="Overdue" value={formatCurrency(money.overdue)} note="Past the due date" />
        <Stat
          label="Left after expenses"
          value={money.marginPercent === null ? "—" : `${formatNumber(money.marginPercent)}%`}
          note={`Expenses ${formatCurrency(money.expenses)}`}
        />
        <Stat label="Hiring from suppliers" value={formatCurrency(money.hireInCost)} note={`Damage charged ${formatCurrency(money.damageCharges)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="How customers pay" description="Cash received in this period, by payment method.">
          {methods.length > 0 ? <RankedBarChart valueLabel="Received" format="currency" data={methods} /> : <Empty />}
        </Panel>
        <Panel title="Who owes, and for how long" description="Open invoices by days past their due date.">
          {aging.some((bucket) => bucket.value > 0) ? (
            <PeakBarChart valueLabel="Owed" format="currency" highlightPeak={false} data={aging} />
          ) : (
            <Empty>Nothing is owed right now.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

/**
 * Business insights on the dashboard: how the business is doing, its seasons
 * and peaks, which stock earns, who the customers are, and where the money is.
 * Shown to people who may read reports.
 */
export function BusinessInsightsSection() {
  const { canRead, isLoading: permissionsLoading } = useAnalyticsPermissions();
  const [months, setMonths] = useState<BusinessInsightsPeriodMonths>(12);
  const insights = useBusinessInsights(months, canRead);
  const cards = useMemo(() => (insights.data ? deriveInsights(insights.data) : []), [insights.data]);

  if (permissionsLoading || !canRead) {
    return null;
  }

  const data = insights.data;

  return (
    <section aria-labelledby="business-insights-heading" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="business-insights-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Business insights
          </h2>
          <p className="text-sm text-muted-foreground">How the business is doing, when it is busiest, and where to act.</p>
        </div>
        <div role="group" aria-label="Period" className="inline-flex rounded-md border border-border bg-card p-0.5">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={months === period}
              onClick={() => setMonths(period)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                months === period ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {period === 24 ? "2 years" : `${period} months`}
            </button>
          ))}
        </div>
      </div>

      {insights.isError && !data ? (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Business insights could not be loaded. Refresh the page to try again.
        </div>
      ) : null}

      {!data && !insights.isError ? <Skeleton className="h-96 w-full" aria-busy="true" aria-label="Loading business insights" /> : null}

      {data ? (
        <Tabs defaultValue="overview" className={cn(insights.isFetching && "opacity-70 transition-opacity")}>
          <div className="min-w-0 overflow-x-auto">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="seasons">Seasons &amp; peaks</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="money">Money</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overview">
            <OverviewTab data={data} cards={cards} />
          </TabsContent>
          <TabsContent value="seasons">
            <SeasonsTab data={data} />
          </TabsContent>
          <TabsContent value="stock">
            <StockTab data={data} />
          </TabsContent>
          <TabsContent value="customers">
            <CustomersTab data={data} />
          </TabsContent>
          <TabsContent value="money">
            <MoneyTab data={data} />
          </TabsContent>
        </Tabs>
      ) : null}
    </section>
  );
}
