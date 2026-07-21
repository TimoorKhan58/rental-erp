"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { RentalInvoiceSummaryCards } from "../components";
import { useRentalInvoiceSummaryStats } from "../hooks";
import { RentalInvoiceListTable } from "../tables";

export function RentalInvoiceListPage() {
  const { stats, statusCounts, paymentStatusCounts, isLoading } =
    useRentalInvoiceSummaryStats();

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Rental invoices"
        description="View and manage rental billing invoices."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental invoices" },
        ]}
      />

      <RentalInvoiceSummaryCards stats={stats} isLoading={isLoading} />

      <RentalInvoiceListTable
        statusCounts={statusCounts}
        paymentStatusCounts={paymentStatusCounts}
      />
    </PageContainer>
  );
}
