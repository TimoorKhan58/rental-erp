"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { RentalOrderSummaryCards } from "../components";
import { useRentalOrderPermissions, useRentalOrderSummaryStats } from "../hooks";
import { RentalOrderListTable } from "../tables";

export function RentalOrderListPage() {
  const { canCreate } = useRentalOrderPermissions();
  const { stats, orderStatusCounts, reservationStatusCounts, isLoading } =
    useRentalOrderSummaryStats();

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Orders"
        description="Every booking, from draft to paid. Open one to send it out, receive it back or bill it."
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalOrdersNew} />}
            >
              New order
            </AppButton>
          ) : null
        }
      />

      <RentalOrderSummaryCards stats={stats} isLoading={isLoading} />

      <RentalOrderListTable
        orderStatusCounts={orderStatusCounts}
        reservationStatusCounts={reservationStatusCounts}
      />
    </PageContainer>
  );
}
