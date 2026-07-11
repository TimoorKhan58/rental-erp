"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useRepairPermissions } from "../hooks";
import { RepairListTable } from "../tables";

export function RepairListPage() {
  const { canCreate } = useRepairPermissions();

  return (
    <PageContainer>
      <PageHeader
        title="Repairs"
        description="Manage repair jobs for returned rental assets."
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

      <RepairListTable />
    </PageContainer>
  );
}
