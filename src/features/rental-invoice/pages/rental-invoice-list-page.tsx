"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useRentalInvoicePermissions } from "../hooks";
import { RentalInvoiceListTable } from "../tables";

export function RentalInvoiceListPage() {
  const { canCreate } = useRentalInvoicePermissions();

  return (
    <PageContainer>
      <PageHeader
        title="Rental invoices"
        description="View and manage rental billing invoices."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental invoices" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalInvoicesNew} />}
            >
              Create invoice
            </AppButton>
          ) : undefined
        }
      />

      <RentalInvoiceListTable />
    </PageContainer>
  );
}
