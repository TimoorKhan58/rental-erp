"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useWarehousePermissions } from "../hooks";
import { WarehouseListTable } from "../tables";

export function WarehouseListPage() {
  const { canCreate } = useWarehousePermissions();

  return (
    <PageContainer>
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations, contacts, and operational status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
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

      <WarehouseListTable />
    </PageContainer>
  );
}
