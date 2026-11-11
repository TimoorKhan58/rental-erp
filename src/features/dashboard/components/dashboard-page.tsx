"use client";

import { PageContainer, AppGrid, AppGridItem } from "@/components/layout";
import { DashboardSkeleton } from "@/components/design-system/loading";
import {
  useBusinessPulse,
  useDashboardNotifications,
  useQuickActions,
} from "../hooks";
import { useOrganizationName } from "@/features/settings/hooks";
import { AttentionNeeded } from "./attention-needed";
import { BusinessPulseRow } from "./business-pulse-row";
import { CatalogSnapshot } from "./catalog-snapshot";
import { DashboardHero } from "./dashboard-hero";
import { NotificationsPanel } from "./notifications-panel";
import { OpsHealthGrid } from "./ops-health-grid";
import { QuickActionsPanel } from "./quick-actions-panel";
import { RentalInsightsSection } from "./rental-insights-section";

/**
 * Operations Control Center — fluid 12-column workspace:
 * command → today → attention → business → inventory → upcoming → secondary.
 */
export function DashboardPage() {
  const pulse = useBusinessPulse();
  const { organizationName } = useOrganizationName();
  const quickActions = useQuickActions();
  const notifications = useDashboardNotifications();

  const isInitialLoading = pulse.isLoading && !pulse.data;

  if (isInitialLoading) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  const data = pulse.data;
  const hasError = pulse.isError && !data;
  const staleRefreshFailed = pulse.isError && Boolean(data);
  const refreshing = pulse.isFetching && !data;

  return (
    <PageContainer className="space-y-4">
      <DashboardHero
        organizationName={organizationName}
        attentionCount={data?.attentionCount ?? 0}
      />

      {hasError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Could not load live business numbers. Check your reports permission or try
          refreshing.
        </div>
      ) : null}

      {staleRefreshFailed ? (
        <div
          role="status"
          className="rounded-md border border-warning/30 bg-warning-muted/40 px-3 py-2 text-xs text-warning-foreground"
        >
          Live refresh failed — showing the last successful snapshot.
        </div>
      ) : null}

      <OpsHealthGrid
        title="Today"
        description="Dispatches, returns, and assets offline"
        columns="today"
        items={data?.todayOps ?? data?.opsHealth?.slice(0, 4) ?? []}
        isLoading={refreshing}
        emptyLabel="No dispatches, returns, or asset jobs today."
      />

      <AppGrid>
        <AppGridItem span={8} smSpan={6}>
          <AttentionNeeded
            items={data?.attention ?? []}
            headline={data?.headline ?? ""}
            isLoading={refreshing}
          />
        </AppGridItem>
        <AppGridItem span={4} smSpan={6} as="aside">
          <QuickActionsPanel
            actions={quickActions.data ?? []}
            isLoading={quickActions.isLoading}
            compact
          />
        </AppGridItem>
      </AppGrid>

      <BusinessPulseRow
        metrics={data?.pulseMetrics ?? []}
        isLoading={refreshing}
      />

      <OpsHealthGrid
        title="Inventory health"
        description="On hand, committed, and available to rent"
        columns="inventory"
        items={data?.inventoryHealth ?? []}
        isLoading={refreshing}
        emptyLabel="No inventory recorded yet."
      />

      <OpsHealthGrid
        title="Upcoming"
        description="Orders and supply already in the pipeline"
        columns="upcoming"
        items={data?.upcoming ?? []}
        isLoading={refreshing}
        emptyLabel="No upcoming orders or purchase orders."
      />

      <AppGrid className="border-t border-border pt-4">
        <AppGridItem span={8} smSpan={6} className="space-y-4">
          <RentalInsightsSection />
          <CatalogSnapshot
            customers={data?.catalog.customers ?? 0}
            products={data?.catalog.products ?? 0}
            suppliers={data?.catalog.suppliers ?? 0}
            warehouses={data?.catalog.warehouses ?? 0}
            isLoading={refreshing}
          />
        </AppGridItem>
        <AppGridItem span={4} smSpan={6} as="aside">
          <NotificationsPanel
            notifications={notifications.data ?? []}
            isLoading={notifications.isLoading}
          />
        </AppGridItem>
      </AppGrid>
    </PageContainer>
  );
}
