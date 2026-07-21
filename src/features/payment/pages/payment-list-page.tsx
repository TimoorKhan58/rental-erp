"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { PaymentSummaryCards } from "../components";
import { usePaymentPermissions, usePaymentSummaryStats } from "../hooks";
import { PaymentListTable } from "../tables";

export function PaymentListPage() {
  const { canCreate } = usePaymentPermissions();
  const { stats, statusCounts, methodCounts, isLoading } = usePaymentSummaryStats();

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Payments"
        description="Record and manage customer payments against rental invoices."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Payments" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.paymentsNew} />}
            >
              Record payment
            </AppButton>
          ) : undefined
        }
      />

      <PaymentSummaryCards stats={stats} isLoading={isLoading} />

      <PaymentListTable statusCounts={statusCounts} methodCounts={methodCounts} />
    </PageContainer>
  );
}
