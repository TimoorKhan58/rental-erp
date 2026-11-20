"use client";

import { DashboardSkeleton } from "@/components/design-system/loading";
import { PageContainer } from "@/components/layout";
import { useFinancialReportPermissions } from "@/features/financial-report/hooks/use-financial-report";
import { useOrganizationName } from "@/features/settings/hooks";

import { useLiveDashboardSummary } from "../hooks";
import { BusinessInsightsSection } from "../insights/business-insights-section";
import { DashboardGreeting } from "./today/dashboard-greeting";
import { MonthSoFar, StockNow } from "./today/stock-and-month";
import { TodayWorklist } from "./today/today-worklist";
import { WeekSchedule } from "./today/week-schedule";

/**
 * Dashboard (usability revamp R2): today's work first, then the next 7
 * days, what stock is free, and this month's money. Below that, business
 * insights (seasons, stock, customers, money) for people who read reports.
 */
export function DashboardPage() {
  const summary = useLiveDashboardSummary();
  const { organizationName } = useOrganizationName();
  // Insights are a report: only for people who may read reports (not workers).
  const { canReadOperational } = useFinancialReportPermissions();

  if (summary.isLoading && !summary.data) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  const data = summary.data;

  return (
    <PageContainer className="space-y-6">
      <DashboardGreeting organizationName={organizationName} />

      {summary.isError && !data ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          The dashboard numbers could not be loaded. Refresh the page to try again.
        </div>
      ) : null}

      {summary.isError && data ? (
        <div role="status" className="rounded-md bg-warning-muted px-3 py-2 text-xs text-warning-foreground">
          Couldn&apos;t refresh just now; showing the numbers from a moment ago.
        </div>
      ) : null}

      {data ? (
        <>
          <TodayWorklist summary={data} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <WeekSchedule today={data.worklist.today} entries={data.worklist.schedule} />
            <StockNow summary={data} />
          </div>
          <MonthSoFar summary={data} />
          {canReadOperational && !data.moneyHidden ? <BusinessInsightsSection /> : null}
        </>
      ) : null}
    </PageContainer>
  );
}
