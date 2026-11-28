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
    <PageContainer className="space-y-5">
      <PageHeader
        title="Upkeep"
        description="Regular servicing of your items. Items are out of stock while the job runs and come back when it is finished."
        breadcrumbs={[
          { label: "Upkeep" },
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
