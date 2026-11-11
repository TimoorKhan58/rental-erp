"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useCustomerPermissions } from "../hooks";
import { CustomerListTable } from "../tables";

export function CustomerListPage() {
  const { canCreate } = useCustomerPermissions();

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Customers"
        description="Find customers quickly by name, code, or phone — manage status and open their workspace."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Customers" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.customersNew} />}
            >
              New customer
            </AppButton>
          ) : undefined
        }
      />

      <CustomerListTable />
    </PageContainer>
  );
}
