"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3Icon, PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { InventorySummaryCards } from "../components";
import { useInventoryPermissions, useInventorySummaryStats } from "../hooks";
import { InventoryListTable } from "../tables";

export function InventoryListPage() {
  const { canCreate } = useInventoryPermissions();
  const { stats, stockStatusCounts, isLoading: isSummaryLoading } = useInventorySummaryStats();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Monitor stock levels, reservations, and reorder thresholds across warehouses."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Inventory" },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<BarChart3Icon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.reportsInventory} />}
            >
              View report
            </AppButton>
            {canCreate ? (
              <AppButton
                leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
                onClick={() => setCreateOpen(true)}
              >
                New record
              </AppButton>
            ) : null}
          </>
        }
      />

      <InventorySummaryCards stats={stats} isLoading={isSummaryLoading} />

      <InventoryListTable
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        stockStatusCounts={stockStatusCounts}
      />
    </PageContainer>
  );
}
