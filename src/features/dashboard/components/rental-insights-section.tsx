"use client";

import Link from "next/link";
import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { useRentalInsights } from "../hooks/use-rental-insights";
import { ArAgingChart, TopProductsChart, UtilizationChart } from "../charts/lazy-insights-charts";

type RentalInsightsSectionProps = {
  className?: string;
};

export const RentalInsightsSection = memo(function RentalInsightsSection({
  className,
}: RentalInsightsSectionProps) {
  const { data, isLoading, isError, isFetching } = useRentalInsights();

  const loading = isLoading || (isFetching && !data);
  const periodLabel =
    data?.period.from && data?.period.to
      ? `${formatDate(data.period.from)} – ${formatDate(data.period.to)}`
      : "Current month";

  return (
    <section aria-label="Rental business insights" className={className}>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-[length:var(--text-small)] font-semibold tracking-[0.06em] text-foreground uppercase">
            Rental insights
          </h2>
          <p className="text-[length:var(--text-caption)] text-muted-foreground">
            Supporting detail — {periodLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link
            href={ROUTES.reportsProducts}
            className="rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Product report
          </Link>
          <Link
            href={`${ROUTES.rentalInvoices}?paymentStatus=unpaid`}
            className="rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Unpaid invoices
          </Link>
        </div>
      </div>

      {isError && !data ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load rental insights.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <TopProductsChart
          title="Top products by revenue"
          description="Line revenue from bookings in period"
          data={data?.topByRevenue ?? []}
          valueKey="revenue"
          isLoading={loading}
        />
        <TopProductsChart
          title="Top products by quantity-days"
          description="Rental volume: quantity × days"
          data={data?.topByQuantityDays ?? []}
          valueKey="quantityDays"
          isLoading={loading}
        />
        <UtilizationChart
          fleet={
            data?.utilization.fleet ?? {
              onHand: 0,
              reserved: 0,
              available: 0,
              utilizationPercent: 0,
            }
          }
          byProduct={data?.utilization.byProduct ?? []}
          isLoading={loading}
        />
        <ArAgingChart
          buckets={data?.arAging.buckets ?? []}
          totalOutstanding={data?.arAging.totalOutstanding ?? 0}
          isLoading={loading}
        />
      </div>

      {loading ? (
        <div className="sr-only" aria-live="polite">
          Loading rental insights
        </div>
      ) : null}
    </section>
  );
});

export function RentalInsightsSectionSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading rental insights">
      <div className="mb-2 space-y-1">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </section>
  );
}
