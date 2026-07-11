"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { RentalInvoiceListTable } from "../tables";

export function RentalInvoiceListPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Rental invoices"
        description="View and manage rental billing invoices."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental invoices" },
        ]}
      />

      <RentalInvoiceListTable />
    </PageContainer>
  );
}
