"use client";

import { DashboardSkeleton } from "@/components/design-system/loading";
import { PageContainer } from "@/components/layout";
import { useFinancialReportPermissions } from "@/features/financial-report/hooks/use-financial-report";
import { useOrganizationName } from "@/features/settings/hooks";

import { useLiveDashboardSummary } from "../hooks";
import { BusinessInsightsSection } from "../insights/business-insights-section";
import { DashboardGreeting } from "./today/dashboard-greeting";
import { StockNow } from "./today/stock-and-month";
import { TodayJobs, TodayNumbers, jobsHeadline } from "./today/today-jobs";
import { TodayWorklist } from "./today/today-worklist";
import { WeekSchedule } from "./today/week-schedule";

/**
 * Home (UI redesign): four numbers, today's jobs with one button each, what
 * needs attention, stock right now, then the next 7 days. Below that,
 * business insights for people who read reports.
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
      <DashboardGreeting
        organizationName={organizationName}
        headline={data ? jobsHeadline(data) : undefined}
      />

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
          <TodayNumbers summary={data} />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <TodayJobs summary={data} />
            <div className="min-w-0 space-y-6">
              <TodayWorklist summary={data} onlyOpen title="Needs your attention" />
              <StockNow summary={data} />
            </div>
          </div>
          <WeekSchedule today={data.worklist.today} entries={data.worklist.schedule} />
          {canReadOperational && !data.moneyHidden ? <BusinessInsightsSection /> : null}
        </>
      ) : null}
    </PageContainer>
  );
}
