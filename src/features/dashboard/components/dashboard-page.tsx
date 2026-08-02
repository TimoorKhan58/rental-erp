"use client";

import { PageContainer } from "@/components/layout";
import { DashboardSkeleton } from "@/components/design-system/loading";
import { QueryErrorState } from "@/components/feedback/query-error-state";
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
 * DashboardPage — 20–25 second business scan for tent rental operations.
 * First viewport: pulse KPIs + attention queue. Below: ops health + actions.
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

  return (
    <PageContainer className="space-y-6">
      <DashboardHero
        organizationName={organizationName}
        attentionCount={data?.attentionCount ?? 0}
      />

      {hasError ? (
        <QueryErrorState
          title="Could not load live business numbers"
          description="Check your reports permission or try refreshing."
          onRetry={() => {
            void pulse.refetch();
          }}
        />
      ) : null}

      <BusinessPulseRow
        metrics={data?.pulseMetrics ?? []}
        isLoading={pulse.isFetching && !data}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <AttentionNeeded
            items={data?.attention ?? []}
            headline={data?.headline ?? ""}
            isLoading={pulse.isFetching && !data}
          />

          <OpsHealthGrid
            items={data?.opsHealth ?? []}
            isLoading={pulse.isFetching && !data}
          />

          <RentalInsightsSection />

          <CatalogSnapshot
            customers={data?.catalog.customers ?? 0}
            products={data?.catalog.products ?? 0}
            suppliers={data?.catalog.suppliers ?? 0}
            warehouses={data?.catalog.warehouses ?? 0}
            isLoading={pulse.isFetching && !data}
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
        </aside>
      </div>
    </PageContainer>
  );
}
