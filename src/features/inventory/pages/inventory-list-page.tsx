"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { InventoryListTable } from "../tables";

export function InventoryListPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Inventory"
        description="Monitor stock levels, reservations, and reorder thresholds across warehouses."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Inventory" },
        ]}
      />

      <InventoryListTable />
    </PageContainer>
  );
}
