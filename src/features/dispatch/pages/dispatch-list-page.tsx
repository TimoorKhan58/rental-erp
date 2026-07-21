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
    <PageContainer className="space-y-6">
      <PageHeader
        title="Deliveries"
        description="Manage rental order fulfillment and deliveries."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Deliveries" },
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
