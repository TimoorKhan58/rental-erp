"use client";

import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useCustomerPermissions } from "../hooks";
import { CustomerListTable } from "../tables";

export function CustomerListPage() {
  const { canCreate } = useCustomerPermissions();

  return (
    <PageContainer className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <UsersIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Customers</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Manage customer profiles, contact details, and account status for your rental
              business.
            </p>
          </div>
        </div>
        {canCreate ? (
          <AppButton
            leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.customersNew} />}
          >
            New customer
          </AppButton>
        ) : null}
      </header>

      <CustomerListTable />
    </PageContainer>
  );
}
