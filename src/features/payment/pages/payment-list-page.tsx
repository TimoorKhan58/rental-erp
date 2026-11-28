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
    <PageContainer className="space-y-5">
      <PageHeader
        title="Payments"
        description="Money received from customers, and whether it went to cash in hand or the bank."
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
