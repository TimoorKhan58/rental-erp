"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { usePaymentPermissions } from "../hooks";
import { PaymentListTable } from "../tables";

export function PaymentListPage() {
  const { canCreate } = usePaymentPermissions();

  return (
    <PageContainer>
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

      <PaymentListTable />
    </PageContainer>
  );
}
