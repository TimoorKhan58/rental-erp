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
        description="Fixing items that came back damaged. Repaired items go back into stock when the job is finished."
        breadcrumbs={[
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
