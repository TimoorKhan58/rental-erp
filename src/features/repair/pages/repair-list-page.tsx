"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { RepairSummaryCards } from "../components";
import { useRepairPermissions, useRepairSummaryStats } from "../hooks";
import { RepairListTable } from "../tables";

export function RepairListPage() {
  const { canCreate } = useRepairPermissions();
  const { stats, statusCounts, isLoading } = useRepairSummaryStats();

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Repairs"
        description="Create a job from damaged quantity on a completed return. Inventory is restocked only when the repair is completed. Cost is recorded on the job, not posted to expenses or invoices."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Repairs" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.repairsNew} />}
            >
              New repair
            </AppButton>
          ) : undefined
        }
      />

      <RepairSummaryCards stats={stats} isLoading={isLoading} />

      <RepairListTable statusCounts={statusCounts} />
    </PageContainer>
  );
}
