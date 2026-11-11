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
    <PageContainer className="space-y-5">
      <PageHeader
        title="Rental Invoices"
        description="Scan invoice number, customer, status, totals, and collection state from authoritative billing data."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental Invoices" },
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
