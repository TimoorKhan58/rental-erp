"use client";

import dynamic from "next/dynamic";
import { PageContainer } from "@/components/layout";
import { DashboardSkeleton } from "@/components/design-system/loading";
import {
  useDashboardMetrics,
  useDashboardNotifications,
  useDashboardSummary,
  useFinancialSummary,
  useInventoryOverview,
  useQuickActions,
  useRecentActivity,
  useRentalTrends,
  useRevenueOverview,
  useSystemStatus,
  useUpcomingTasks,
} from "../hooks";
import { useOrganizationName } from "@/features/settings/hooks";
import { DashboardHero } from "./dashboard-hero";
import { FeaturedKpiRow } from "./featured-kpi-row";
import { KpiGrid } from "./kpi-grid";
import { QuickActionsPanel } from "./quick-actions-panel";
import { ActivityTimeline } from "./activity-timeline";
import { NotificationsPanel } from "./notifications-panel";
import { UpcomingTasksList } from "./upcoming-tasks";
import { InventoryOverviewSection } from "./inventory-overview";
import { FinancialSummarySection } from "./financial-summary";
import { SystemStatusSection } from "./system-status";

const RevenueChart = dynamic(
  () => import("./revenue-chart").then((mod) => mod.RevenueChart),
  { loading: () => null, ssr: false },
);

const RentalTrendsChart = dynamic(
  () => import("./rental-trends-chart").then((mod) => mod.RentalTrendsChart),
  { loading: () => null, ssr: false },
);

/**
 * DashboardPage — enterprise dashboard home composition.
 */
export function DashboardPage() {
  const summary = useDashboardSummary();
  const { organizationName } = useOrganizationName();
  const metrics = useDashboardMetrics();
  const quickActions = useQuickActions();
  const activity = useRecentActivity();
  const notifications = useDashboardNotifications();
  const tasks = useUpcomingTasks();
  const revenue = useRevenueOverview();
  const rentalTrends = useRentalTrends();
  const inventory = useInventoryOverview();
  const financial = useFinancialSummary();
  const systemStatus = useSystemStatus();

  const isInitialLoading =
    summary.isLoading &&
    metrics.isLoading &&
    !summary.data &&
    !metrics.data;

  const allMetrics = metrics.data ?? [];
  const secondaryMetrics = allMetrics.slice(4);

  if (isInitialLoading) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <DashboardHero organizationName={organizationName} />

      <FeaturedKpiRow metrics={allMetrics} isLoading={metrics.isLoading} />

      {secondaryMetrics.length > 0 ? (
        <KpiGrid metrics={secondaryMetrics} isLoading={metrics.isLoading} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart data={revenue.data} isLoading={revenue.isLoading} />
            <RentalTrendsChart
              data={rentalTrends.data}
              isLoading={rentalTrends.isLoading}
            />
          </div>

          <FinancialSummarySection
            items={financial.data ?? []}
            isLoading={financial.isLoading}
          />

          <InventoryOverviewSection
            items={inventory.data ?? []}
            isLoading={inventory.isLoading}
          />

          <ActivityTimeline
            items={activity.data ?? []}
            isLoading={activity.isLoading}
          />
        </div>

        <aside className="space-y-6">
          <QuickActionsPanel
            actions={quickActions.data ?? []}
            isLoading={quickActions.isLoading}
            compact
          />

          <NotificationsPanel
            notifications={notifications.data ?? []}
            isLoading={notifications.isLoading}
          />

          <UpcomingTasksList tasks={tasks.data ?? []} isLoading={tasks.isLoading} />

          <SystemStatusSection
            items={systemStatus.data ?? []}
            isLoading={systemStatus.isLoading}
          />
        </aside>
      </div>
    </PageContainer>
  );
}
