"use client";

import dynamic from "next/dynamic";
import { ContentContainer } from "@/components/design-system/page";
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
import { WelcomeHeader } from "./welcome-header";
import { KpiGrid, PRIMARY_KPI_COUNT } from "./kpi-grid";
import { QuickActionsPanel } from "./quick-actions-panel";
import { ActivityTimeline } from "./activity-timeline";
import { NotificationsPanel } from "./notifications-panel";
import { UpcomingTasksList } from "./upcoming-tasks";
import { InventoryOverviewSection } from "./inventory-overview";
import { AssetUtilizationSection } from "./financial-summary";
import { SystemStatusSection } from "./system-status";
import { DashboardCol, DashboardGrid } from "./widgets";

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
 *
 * Layout (12-col grid):
 * Header → 4 KPIs → Alerts | Tasks → Revenue | Rental Activity →
 * Asset Utilization | Inventory Health → Recent Activity → System Status → Quick Actions
 */
export function DashboardPage() {
  const summary = useDashboardSummary();
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
  const primaryMetrics = allMetrics.slice(0, PRIMARY_KPI_COUNT);
  const secondaryMetrics = allMetrics.slice(PRIMARY_KPI_COUNT);

  if (isInitialLoading) {
    return (
    <PageContainer className="p-6 md:p-6">
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4 p-6 md:p-6">
      <WelcomeHeader
        organizationName={summary.data?.organizationName ?? "Organization"}
      />

      <ContentContainer className="gap-4">
        <KpiGrid
          metrics={primaryMetrics}
          isLoading={metrics.isLoading}
          limit={PRIMARY_KPI_COUNT}
        />

        <DashboardGrid>
          <DashboardCol span={6}>
            <NotificationsPanel
              notifications={notifications.data ?? []}
              isLoading={notifications.isLoading}
            />
          </DashboardCol>
          <DashboardCol span={6}>
            <UpcomingTasksList
              tasks={tasks.data ?? []}
              isLoading={tasks.isLoading}
            />
          </DashboardCol>
        </DashboardGrid>

        <DashboardGrid>
          <DashboardCol span={6}>
            <RevenueChart data={revenue.data} isLoading={revenue.isLoading} />
          </DashboardCol>
          <DashboardCol span={6}>
            <RentalTrendsChart
              data={rentalTrends.data}
              isLoading={rentalTrends.isLoading}
            />
          </DashboardCol>
        </DashboardGrid>

        <DashboardGrid>
          <DashboardCol span={6}>
            <AssetUtilizationSection
              financialItems={financial.data ?? []}
              secondaryMetrics={secondaryMetrics}
              isLoading={financial.isLoading || metrics.isLoading}
            />
          </DashboardCol>
          <DashboardCol span={6}>
            <InventoryOverviewSection
              items={inventory.data ?? []}
              isLoading={inventory.isLoading}
            />
          </DashboardCol>
        </DashboardGrid>

        <ActivityTimeline
          items={activity.data ?? []}
          isLoading={activity.isLoading}
        />

        <SystemStatusSection
          items={systemStatus.data ?? []}
          isLoading={systemStatus.isLoading}
        />

        <QuickActionsPanel
          actions={quickActions.data ?? []}
          isLoading={quickActions.isLoading}
        />
      </ContentContainer>
    </PageContainer>
  );
}
