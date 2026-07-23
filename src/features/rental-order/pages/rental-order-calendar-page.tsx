"use client";

import Link from "next/link";
import { ClipboardListIcon, PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { AccessDeniedState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { ReservationCalendar } from "../components/reservation-calendar";
import { useRentalOrderPermissions } from "../hooks";

export function RentalOrderCalendarPage() {
  const { canRead, canCreate, isLoading } = useRentalOrderPermissions();

  if (!isLoading && !canRead) {
    return <AccessDeniedState />;
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Reservation Calendar"
        description="Weekly and monthly view of rental reservations and advance bookings by event dates."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental Orders", href: ROUTES.rentalOrders },
          { label: "Calendar" },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ClipboardListIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalOrders} />}
            >
              Order list
            </AppButton>
            {canCreate ? (
              <AppButton
                leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.rentalOrdersNew} />}
              >
                New rental order
              </AppButton>
            ) : null}
          </>
        }
      />

      <ReservationCalendar />
    </PageContainer>
  );
}
