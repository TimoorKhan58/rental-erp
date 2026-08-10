"use client";

import { Suspense, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, EmptyState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  DateRangeFilterBar,
  ReportsSubNav,
} from "@/features/financial-report/components";
import { useDateRangeParams } from "@/features/financial-report/hooks";
import {
  ANALYTICS_METRIC_LABELS,
  ANALYTICS_SCOPE_HINTS,
} from "../constants/analytics-labels";
import { AnalyticsMetricCard, AnalyticsSection } from "../components";
import {
  useAnalyticsOverview,
  useAnalyticsPermissions,
} from "../hooks";
import {
  getDefaultAnalyticsDateRange,
  isValidAnalyticsDateRange,
} from "../utils";

function AnalyticsDashboardContent() {
  const { canRead, isLoading: permissionsLoading } = useAnalyticsPermissions();
  const defaultRange = useMemo(() => getDefaultAnalyticsDateRange(), []);
  const { params, dateFrom, dateTo, setDateRange } =
    useDateRangeParams(defaultRange);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsOverview(params);

  const handleDateRangeChange = (from?: string, to?: string) => {
    if (!isValidAnalyticsDateRange(from, to)) {
      setDateRangeError("Date from must be on or before date to.");
      return;
    }
    setDateRangeError(null);
    setDateRange(from, to);
  };

  if (permissionsLoading) {
    return <LoadingState label="Checking permissions..." />;
  }

  if (!canRead) {
    return (
      <EmptyState
        title="Analytics unavailable"
        description="You need reports read permission to view executive analytics."
      />
    );
  }

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Analytics could not be loaded</p>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "The analytics overview request failed."}
        </p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilterBar
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={handleDateRangeChange}
            />
            <AppButton
              variant="outline"
              size="sm"
              loading={isFetching && !isLoading}
              onClick={() => void refetch()}
            >
              Refresh
            </AppButton>
          </div>
          {dateRangeError ? (
            <p className="text-xs text-destructive" role="alert">
              {dateRangeError}
            </p>
          ) : null}
        </div>
        {data ? (
          <p className="text-xs text-muted-foreground sm:text-right">
            Period {formatDate(data.period.dateFrom)} –{" "}
            {formatDate(data.period.dateTo)}. Money and acquisition metrics use
            this range; rental/inventory/ops counts are current snapshots.
          </p>
        ) : null}
      </div>

      {isLoading && !data ? (
        <LoadingState label="Loading analytics overview..." />
      ) : data ? (
        <>
          <AnalyticsSection
            title="Financial overview"
            description="Qualified money metrics for the selected period, plus current outstanding AR."
          >
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.bookedRentalValue}
              value={formatCurrency(data.bookedRentalValue)}
              hint={ANALYTICS_SCOPE_HINTS.bookedRentalValueDate}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.billedRevenue}
              value={formatCurrency(data.billedRevenue)}
              hint={`${ANALYTICS_SCOPE_HINTS.period} · invoice date`}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.collectedCash}
              value={formatCurrency(data.collectedCash)}
              hint={`${ANALYTICS_SCOPE_HINTS.period} · posted payments`}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.recognizedRevenue}
              value={formatCurrency(data.recognizedRevenue)}
              hint={`${ANALYTICS_SCOPE_HINTS.period} · posted GL income`}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.outstandingAR}
              value={formatCurrency(data.financial.outstandingAR)}
              hint={`${ANALYTICS_SCOPE_HINTS.snapshot} · ${ANALYTICS_SCOPE_HINTS.arAttention}`}
              tone={
                data.financial.outstandingAR > 0 ? "attention" : "default"
              }
            />
          </AnalyticsSection>

          <AnalyticsSection
            title="Rental operations"
            description="Booking/operational rental counts. Active does not mean physically on rent."
          >
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.activeRentals}
              value={formatNumber(data.rentals.activeCount)}
              hint={ANALYTICS_SCOPE_HINTS.activeDefinition}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.upcomingRentals}
              value={formatNumber(data.rentals.upcomingCount)}
              hint={ANALYTICS_SCOPE_HINTS.upcomingDefinition}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.overdueRentals}
              value={formatNumber(data.rentals.overdueCount)}
              hint={`${ANALYTICS_SCOPE_HINTS.snapshot} · ${ANALYTICS_SCOPE_HINTS.overdueAttention}`}
              tone={data.rentals.overdueCount > 0 ? "critical" : "default"}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.completedRentals}
              value={formatNumber(data.rentals.completedCount)}
              hint={ANALYTICS_SCOPE_HINTS.completedRentals}
            />
          </AnalyticsSection>

          <AnalyticsSection
            title="Inventory"
            description="Reliable stock concepts only. Physically rented quantity is not exposed."
          >
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.availableQuantity}
              value={formatNumber(data.inventory.availableQuantity)}
              hint={ANALYTICS_SCOPE_HINTS.snapshot}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.reservedQuantity}
              value={formatNumber(data.inventory.reservedQuantity)}
              hint={ANALYTICS_SCOPE_HINTS.snapshot}
            />
          </AnalyticsSection>

          <AnalyticsSection
            title="Customers & procurement"
            description="Period-scoped acquisition and ordered purchase value."
          >
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.newCustomers}
              value={formatNumber(data.customers.newCount)}
              hint={`${ANALYTICS_SCOPE_HINTS.period} · active customers`}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.orderedProcurementValue}
              value={formatCurrency(data.procurement.orderedProcurementValue)}
              hint={`${ANALYTICS_SCOPE_HINTS.period} · excl. draft/cancelled`}
            />
          </AnalyticsSection>

          <AnalyticsSection
            title="Operational health"
            description="Keep asset maintenance and rental repair jobs separate."
          >
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.assetsUnderMaintenance}
              value={formatNumber(
                data.operations.assetsUnderMaintenanceCount,
              )}
              hint={ANALYTICS_SCOPE_HINTS.snapshot}
              tone={
                data.operations.assetsUnderMaintenanceCount > 0
                  ? "attention"
                  : "default"
              }
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.rentalMaintenanceJobs}
              value={formatNumber(
                data.operations.rentalMaintenanceJobsOpenCount,
              )}
              hint={`${ANALYTICS_SCOPE_HINTS.snapshot} · open jobs`}
            />
            <AnalyticsMetricCard
              label={ANALYTICS_METRIC_LABELS.repairJobs}
              value={formatNumber(data.operations.repairJobsOpenCount)}
              hint={`${ANALYTICS_SCOPE_HINTS.snapshot} · open jobs`}
            />
          </AnalyticsSection>
        </>
      ) : null}
    </div>
  );
}

export function AnalyticsDashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Executive overview of booked value, billed revenue, collected cash, recognized revenue, rentals, inventory, and operations."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Analytics" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading analytics..." />}>
        <AnalyticsDashboardContent />
      </Suspense>
    </PageContainer>
  );
}
