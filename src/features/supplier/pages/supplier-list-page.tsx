"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useSupplierPermissions } from "../hooks";
import { SupplierListTable } from "../tables";

export function SupplierListPage() {
  const { canCreate } = useSupplierPermissions();

  return (
    <PageContainer>
      <PageHeader
        title="Suppliers"
        description="Manage supplier profiles, contact details, and account status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Suppliers" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.suppliersNew} />}
            >
              New supplier
            </AppButton>
          ) : undefined
        }
      />

      <SupplierListTable />
    </PageContainer>
  );
}
