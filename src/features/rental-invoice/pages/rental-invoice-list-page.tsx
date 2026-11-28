"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import { RentalInvoiceSummaryCards } from "../components";
import { useRentalInvoiceSummaryStats } from "../hooks";
import { RentalInvoiceListTable } from "../tables";

export function RentalInvoiceListPage() {
  const { stats, statusCounts, paymentStatusCounts, isLoading } =
    useRentalInvoiceSummaryStats();

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Invoices"
        description="Bills sent to customers, and how much is still to collect."
      />

      <RentalInvoiceSummaryCards stats={stats} isLoading={isLoading} />

      <RentalInvoiceListTable
        statusCounts={statusCounts}
        paymentStatusCounts={paymentStatusCounts}
      />
    </PageContainer>
  );
}
