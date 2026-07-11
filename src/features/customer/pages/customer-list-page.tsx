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
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Manage customer profiles, contact details, and account status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Customers" },
        ]}
        actions={
          canCreate ? (
            <AppButton
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
