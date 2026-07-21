"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileTextIcon, IdCardIcon, StickyNoteIcon } from "lucide-react";
import { useState } from "react";
import { PageContainer } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppBreadcrumb } from "@/components/design-system/navigation";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer, useCustomerPermissions } from "../hooks";
import { CustomerProfileCard } from "../components/customer-profile-card";
import { DeleteCustomerDialog } from "../dialogs/delete-customer-dialog";
import { ToggleCustomerStatusDialog } from "../dialogs/toggle-customer-status-dialog";

type CustomerDetailPageProps = {
  customerId: string;
};

function DetailField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
      {icon ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 space-y-0.5">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{value?.trim() ? value : "—"}</dd>
      </div>
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
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
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
    <PageContainer className="space-y-6">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Customer details" description="Profile and identification information">
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField
                label="Customer code"
                value={customer.customerCode}
                icon={<FileTextIcon className="size-4" aria-hidden="true" />}
              />
              <DetailField
                label="CNIC"
                value={customer.cnic}
                icon={<IdCardIcon className="size-4" aria-hidden="true" />}
              />
              <DetailField
                label="Address"
                value={customer.address}
                icon={<FileTextIcon className="size-4" aria-hidden="true" />}
              />
              <DetailField
                label="Notes"
                value={customer.notes}
                icon={<StickyNoteIcon className="size-4" aria-hidden="true" />}
              />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Rental summary"
            description="Rental history and outstanding balances will appear here when the rental module is connected."
          />
        </div>

        <div className="space-y-6">
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

          <EmptyCard
            title="Recent activity"
            description="Customer activity timeline is not yet available."
          />
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
