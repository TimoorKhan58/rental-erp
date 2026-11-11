"use client";

import Link from "next/link";
import { BarChart3Icon, CalendarDaysIcon, PlusIcon } from "lucide-react";
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
        title="Rental Orders"
        description="Scan bookings by customer, period, status, and reservation progress."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental Orders" },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<CalendarDaysIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalOrdersCalendar} />}
            >
              Calendar
            </AppButton>
            <AppButton
              variant="outline"
              leftIcon={<BarChart3Icon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.reportsRental} />}
            >
              View report
            </AppButton>
            {canCreate ? (
              <AppButton
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.rentalOrdersNew} />}
              >
                New rental order
              </AppButton>
            ) : null}
          </>
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
