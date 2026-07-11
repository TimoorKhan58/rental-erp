"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useSupplier, useSupplierPermissions } from "../hooks";
import { SupplierStatusBadge } from "../components/supplier-status-badge";
import { DeleteSupplierDialog } from "../dialogs/delete-supplier-dialog";
import { ToggleSupplierStatusDialog } from "../dialogs/toggle-supplier-status-dialog";

type SupplierDetailPageProps = {
  supplierId: string;
};

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export function SupplierDetailPage({ supplierId }: SupplierDetailPageProps) {
  const router = useRouter();
  const { data: supplier, isLoading, isError, error, refetch } = useSupplier(supplierId);
  const { canUpdate, canDelete } = useSupplierPermissions();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading supplier details..." />
      </PageContainer>
    );
  }

  if (isError || !supplier) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Supplier not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested supplier could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.suppliers} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={supplier.name}
        description={`Supplier code: ${supplier.supplierCode}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Suppliers", href: ROUTES.suppliers },
          { label: supplier.name },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.suppliers} />}
            >
              Back
            </AppButton>
            {canUpdate ? (
              <AppButton
                variant="outline"
                leftIcon={
                  supplier.isActive ? (
                    <UserXIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <UserCheckIcon className="size-4" aria-hidden="true" />
                  )
                }
                onClick={() => setStatusOpen(true)}
              >
                {supplier.isActive ? "Deactivate" : "Activate"}
              </AppButton>
            ) : null}
            {canUpdate ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.supplierEdit(supplier.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canDelete ? (
              <AppButton
                variant="destructive"
                leftIcon={<Trash2Icon className="size-4" aria-hidden="true" />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </AppButton>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Profile"
            actions={<SupplierStatusBadge isActive={supplier.isActive} />}
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Supplier code" value={supplier.supplierCode} />
              <DetailField label="Name" value={supplier.name} />
              <DetailField label="Phone" value={supplier.phone} />
              <DetailField label="Email" value={supplier.email} />
              <DetailField label="Address" value={supplier.address} />
              <DetailField label="Notes" value={supplier.notes} />
            </dl>
          </SectionCard>

          <SectionCard title="Contact details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Phone" value={supplier.phone} />
              <DetailField label="Email" value={supplier.email} />
              <DetailField label="Address" value={supplier.address} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Procurement summary"
            description="Purchase orders and outstanding balances will appear here when the procurement module is connected."
          />

          <EmptyCard
            title="Recent activity"
            description="Supplier activity timeline is not yet available."
          />
        </div>

        <div className="space-y-6">
          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Status" value={supplier.isActive ? "Active" : "Inactive"} />
              <DetailField label="Created" value={formatDate(supplier.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(supplier.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Audit summary"
            description="Audit trail details will be shown when available from the API."
          />
        </div>
      </div>

      <DeleteSupplierDialog
        supplier={supplier}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push(ROUTES.suppliers)}
      />

      <ToggleSupplierStatusDialog
        supplier={supplier}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </PageContainer>
  );
}
