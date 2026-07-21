"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { MaintenanceSummaryCards } from "../components";
import { useMaintenancePermissions, useMaintenanceSummaryStats } from "../hooks";
import { MaintenanceListTable } from "../tables";

export function MaintenanceListPage() {
  const { canCreate } = useMaintenancePermissions();
  const { stats, statusCounts, serviceTypeCounts, isLoading } = useMaintenanceSummaryStats();

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Manage scheduled and preventive maintenance activities."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Maintenance" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.maintenanceNew} />}
            >
              New maintenance
            </AppButton>
          ) : undefined
        }
      />

      <MaintenanceSummaryCards stats={stats} isLoading={isLoading} />

      <MaintenanceListTable
        statusCounts={statusCounts}
        serviceTypeCounts={serviceTypeCounts}
      />
    </PageContainer>
  );
}
