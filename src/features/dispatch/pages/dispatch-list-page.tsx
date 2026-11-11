"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { DispatchSummaryCards } from "../components";
import { useDispatchPermissions, useDispatchSummaryStats } from "../hooks";
import { DispatchListTable } from "../tables";

export function DispatchListPage() {
  const { canCreate } = useDispatchPermissions();
  const { stats, statusCounts, isLoading } = useDispatchSummaryStats();

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Dispatches"
        description="Fulfill rental orders by delivery or customer pickup. Completing a ready dispatch posts stock OUT and can move the order On rent."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Dispatches" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.dispatchesNew} />}
            >
              New dispatch
            </AppButton>
          ) : undefined
        }
      />

      <DispatchSummaryCards stats={stats} isLoading={isLoading} />

      <DispatchListTable statusCounts={statusCounts} />
    </PageContainer>
  );
}
