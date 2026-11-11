"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageContainer } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppBreadcrumb } from "@/components/design-system/navigation";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer, useCustomerPermissions } from "../hooks";
import { CustomerProfileCard } from "../components/customer-profile-card";
import { CustomerBillingSection } from "../components/customer-billing-section";
import { CustomerRentalActivitySection } from "../components/customer-rental-activity-section";
import { DeleteCustomerDialog } from "../dialogs/delete-customer-dialog";
import { ToggleCustomerStatusDialog } from "../dialogs/toggle-customer-status-dialog";

type CustomerDetailPageProps = {
  customerId: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/15 px-3 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export function CustomerDetailPage({ customerId }: CustomerDetailPageProps) {
  const router = useRouter();
  const { data: customer, isLoading, isError, error, refetch } = useCustomer(customerId);
  const { canUpdate, canDelete } = useCustomerPermissions();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading customer details..." />
      </PageContainer>
    );
  }

  if (isError || !customer) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Customer not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested customer could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.customers} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <AppBreadcrumb
        items={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Customers", href: ROUTES.customers },
          { label: customer.name },
        ]}
      />

      <CustomerProfileCard
        customer={customer}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onToggleStatus={() => setStatusOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      <div className="app-grid">
        <div className="min-w-0 space-y-5 sm:col-span-6 lg:col-span-8">
          <SectionCard title="Customer details">
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Customer code" value={customer.customerCode} />
              <DetailField label="CNIC" value={customer.cnic} />
              <DetailField label="Address" value={customer.address} />
              <DetailField label="Notes" value={customer.notes} />
            </dl>
          </SectionCard>

          <CustomerRentalActivitySection customerId={customer.id} />
          <CustomerBillingSection customerId={customer.id} />
        </div>

        <div className="min-w-0 space-y-5 sm:col-span-6 lg:col-span-4">
          <SectionCard title="Account timeline">
            <dl className="space-y-3">
              <DetailField
                label="Status"
                value={customer.isActive ? "Active" : "Inactive"}
              />
              <DetailField label="Created" value={formatDate(customer.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(customer.updatedAt)} />
            </dl>
          </SectionCard>
        </div>
      </div>

      <DeleteCustomerDialog
        customer={customer}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push(ROUTES.customers)}
      />

      <ToggleCustomerStatusDialog
        customer={customer}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </PageContainer>
  );
}
