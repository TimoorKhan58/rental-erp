"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useDispatchPermissions } from "../hooks";
import { DispatchListTable } from "../tables";

export function DispatchListPage() {
  const { canCreate } = useDispatchPermissions();

  return (
    <PageContainer>
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

      <DispatchListTable />
    </PageContainer>
  );
}
