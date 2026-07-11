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
import { useWarehouse, useWarehousePermissions } from "../hooks";
import { WarehouseStatusBadge } from "../components/warehouse-status-badge";
import { DeleteWarehouseDialog } from "../dialogs/delete-warehouse-dialog";
import { ToggleWarehouseStatusDialog } from "../dialogs/toggle-warehouse-status-dialog";

type WarehouseDetailPageProps = {
  warehouseId: string;
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

export function WarehouseDetailPage({ warehouseId }: WarehouseDetailPageProps) {
  const router = useRouter();
  const { data: warehouse, isLoading, isError, error, refetch } = useWarehouse(warehouseId);
  const { canUpdate, canDelete } = useWarehousePermissions();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading warehouse details..." />
      </PageContainer>
    );
  }

  if (isError || !warehouse) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Warehouse not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested warehouse could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.warehouses} />}>
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
        title={warehouse.name}
        description={`Warehouse code: ${warehouse.warehouseCode}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Warehouses", href: ROUTES.warehouses },
          { label: warehouse.name },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.warehouses} />}
            >
              Back
            </AppButton>
            {canUpdate ? (
              <AppButton
                variant="outline"
                leftIcon={
                  warehouse.isActive ? (
                    <UserXIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <UserCheckIcon className="size-4" aria-hidden="true" />
                  )
                }
                onClick={() => setStatusOpen(true)}
              >
                {warehouse.isActive ? "Deactivate" : "Activate"}
              </AppButton>
            ) : null}
            {canUpdate ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.warehouseEdit(warehouse.id)} />}
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
            actions={<WarehouseStatusBadge isActive={warehouse.isActive} />}
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Warehouse code" value={warehouse.warehouseCode} />
              <DetailField label="Name" value={warehouse.name} />
              <DetailField label="Description" value={warehouse.description} />
              <DetailField label="Address" value={warehouse.address} />
            </dl>
          </SectionCard>

          <SectionCard title="Contact information">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Contact person" value={warehouse.contactPerson} />
              <DetailField label="Phone" value={warehouse.phone} />
            </dl>
          </SectionCard>

          <SectionCard title="Location">
            <dl className="grid gap-4">
              <DetailField label="Address" value={warehouse.address} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Inventory summary"
            description="Stock levels and capacity details will appear here when the inventory module is connected."
          />

          <EmptyCard
            title="Recent stock movement"
            description="Stock movement history is not yet available."
          />
        </div>

        <div className="space-y-6">
          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Status" value={warehouse.isActive ? "Active" : "Inactive"} />
              <DetailField label="Created" value={formatDate(warehouse.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(warehouse.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Audit summary"
            description="Audit trail details will be shown when available from the API."
          />
        </div>
      </div>

      <DeleteWarehouseDialog
        warehouse={warehouse}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push(ROUTES.warehouses)}
      />

      <ToggleWarehouseStatusDialog
        warehouse={warehouse}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </PageContainer>
  );
}
