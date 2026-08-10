"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { AssetSummaryCards } from "../components";
import { useAssetPermissions, useAssetSummaryStats } from "../hooks";
import { AssetListTable } from "../tables";

export function AssetListPage() {
  const { canCreate } = useAssetPermissions();
  const { stats, statusCounts, isLoading } = useAssetSummaryStats();

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Assets"
        description="Register and manage fixed assets across warehouses."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Assets" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.assetsNew} />}
            >
              Register asset
            </AppButton>
          ) : undefined
        }
      />

      <AssetSummaryCards stats={stats} isLoading={isLoading} />
      <AssetListTable statusCounts={statusCounts} />
    </PageContainer>
  );
}
