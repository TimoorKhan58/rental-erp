"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useRentalOrderPermissions } from "../hooks";
import { RentalOrderListTable } from "../tables";

export function RentalOrderListPage() {
  const { canCreate } = useRentalOrderPermissions();

  return (
    <PageContainer>
      <PageHeader
        title="Rental Orders"
        description="Manage rental bookings, confirmations, and inventory reservations."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental Orders" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalOrdersNew} />}
            >
              New rental order
            </AppButton>
          ) : undefined
        }
      />

      <RentalOrderListTable />
    </PageContainer>
  );
}
