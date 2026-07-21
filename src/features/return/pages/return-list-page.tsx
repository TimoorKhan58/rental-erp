"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { ReturnSummaryCards } from "../components";
import { useReturnPermissions, useReturnSummaryStats } from "../hooks";
import { ReturnListTable } from "../tables";

export function ReturnListPage() {
  const { canCreate } = useReturnPermissions();
  const { stats, statusCounts, isLoading } = useReturnSummaryStats();

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Returns"
        description="Manage returned rental assets and inspection workflows."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Returns" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.returnsNew} />}
            >
              New return
            </AppButton>
          ) : undefined
        }
      />

      <ReturnSummaryCards stats={stats} isLoading={isLoading} />

      <ReturnListTable statusCounts={statusCounts} />
    </PageContainer>
  );
}
