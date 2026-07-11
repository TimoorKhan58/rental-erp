"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useMaintenancePermissions } from "../hooks";
import { MaintenanceListTable } from "../tables";

export function MaintenanceListPage() {
  const { canCreate } = useMaintenancePermissions();

  return (
    <PageContainer>
      <PageHeader
        title="Maintenance"
        description="Manage scheduled and preventive maintenance activities."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Maintenance" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.maintenanceNew} />}
            >
              New maintenance
            </AppButton>
          ) : undefined
        }
      />

      <MaintenanceListTable />
    </PageContainer>
  );
}
