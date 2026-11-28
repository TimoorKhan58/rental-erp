"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { WarehouseStockCards } from "../components";
import { useWarehousePermissions } from "../hooks";
import { WarehouseListTable } from "../tables";

export function WarehouseListPage() {
  const { canCreate } = useWarehousePermissions();

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Warehouses"
        description="Where your stock is kept, and how much of it is free to rent today."
        breadcrumbs={[
          { label: "Warehouses" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.warehousesNew} />}
            >
              New warehouse
            </AppButton>
          ) : undefined
        }
      />

      <WarehouseStockCards />

      <WarehouseListTable />
    </PageContainer>
  );
}
