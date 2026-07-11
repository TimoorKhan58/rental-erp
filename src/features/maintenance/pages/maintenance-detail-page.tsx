"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  PencilIcon,
  PlayIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard, MetricCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  canCancelMaintenance,
  canCompleteMaintenance,
  canEditMaintenance,
  canStartMaintenance,
  SERVICE_TYPE_LABELS,
} from "../mappers";
import {
  useMaintenance,
  useMaintenanceFilterOptions,
  useMaintenancePermissions,
} from "../hooks";
import { MaintenanceStatusBadge } from "../components/maintenance-status-badge";
import { MaintenanceStatusTimeline } from "../components/maintenance-status-timeline";
import { CancelMaintenanceDialog } from "../dialogs/cancel-maintenance-dialog";
import { CompleteMaintenanceDialog } from "../dialogs/complete-maintenance-dialog";
import { StartMaintenanceDialog } from "../dialogs/start-maintenance-dialog";

type MaintenanceDetailPageProps = {
  maintenanceId: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || (typeof value === "string" && !value.trim())
      ? "—"
      : String(value);

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{display}</dd>
    </div>
  );
}

export function MaintenanceDetailPage({ maintenanceId }: MaintenanceDetailPageProps) {
  const router = useRouter();
  const { data: maintenance, isLoading, isError, error, refetch } =
    useMaintenance(maintenanceId);
  const { canUpdate, canStart, canComplete, canCancel } = useMaintenancePermissions();
  const { productLabelById, warehouseLabelById } = useMaintenanceFilterOptions();

  const [startOpen, setStartOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading maintenance details..." />
      </PageContainer>
    );
  }

  if (isError || !maintenance) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Maintenance not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested maintenance record could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.maintenance} />}>
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
        title={maintenance.maintenanceNumber}
        description={`${SERVICE_TYPE_LABELS[maintenance.serviceType]} maintenance for ${
          productLabelById.get(maintenance.productId) ?? maintenance.productId
        }`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Maintenance", href: ROUTES.maintenance },
          { label: maintenance.maintenanceNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.maintenance} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditMaintenance(maintenance.status) ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.maintenanceEdit(maintenance.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canStart && canStartMaintenance(maintenance.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<PlayIcon className="size-4" aria-hidden="true" />}
                onClick={() => setStartOpen(true)}
              >
                Start
              </AppButton>
            ) : null}
            {canComplete && canCompleteMaintenance(maintenance.status) ? (
              <AppButton
                leftIcon={<CheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setCompleteOpen(true)}
              >
                Complete
              </AppButton>
            ) : null}
            {canCancel && canCancelMaintenance(maintenance.status) ? (
              <AppButton
                variant="destructive"
                leftIcon={<XIcon className="size-4" aria-hidden="true" />}
                onClick={() => setCancelOpen(true)}
              >
                Cancel
              </AppButton>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Quantity" value={maintenance.quantity} />
        <MetricCard label="Estimated cost" value={formatCurrency(maintenance.estimatedCost)} />
        <MetricCard label="Scheduled date" value={formatDate(maintenance.scheduledDate)} />
        <MetricCard
          label="Status"
          value={<MaintenanceStatusBadge status={maintenance.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Maintenance summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Maintenance number" value={maintenance.maintenanceNumber} />
              <DetailField
                label="Service type"
                value={SERVICE_TYPE_LABELS[maintenance.serviceType]}
              />
              <DetailField
                label="Scheduled date"
                value={formatDate(maintenance.scheduledDate)}
              />
              <DetailField label="Quantity" value={maintenance.quantity} />
              <DetailField label="Technician" value={maintenance.technician} />
              <DetailField label="Vendor" value={maintenance.vendor} />
              <DetailField label="Notes" value={maintenance.notes} />
            </dl>
          </SectionCard>

          <SectionCard title="Product / asset">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Product"
                value={productLabelById.get(maintenance.productId) ?? maintenance.productId}
              />
              <DetailField
                label="Warehouse"
                value={
                  warehouseLabelById.get(maintenance.warehouseId) ?? maintenance.warehouseId
                }
              />
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  render={<Link href={ROUTES.productDetail(maintenance.productId)} />}
                >
                  View product
                </AppButton>
                <AppButton
                  variant="outline"
                  size="sm"
                  render={<Link href={ROUTES.inventoryDetail(maintenance.inventoryId)} />}
                >
                  View inventory
                </AppButton>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Costs">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Estimated cost"
                value={formatCurrency(maintenance.estimatedCost)}
              />
              <DetailField
                label="Actual cost"
                value={formatCurrency(maintenance.actualCost)}
              />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Repair history"
            description="Related repair records will appear here when repair integration is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status timeline"
            actions={<MaintenanceStatusBadge status={maintenance.status} />}
          >
            <MaintenanceStatusTimeline status={maintenance.status} />
          </SectionCard>

          <SectionCard title="Milestones">
            <dl className="space-y-4">
              <DetailField
                label="Started at"
                value={maintenance.startedAt ? formatDateTime(maintenance.startedAt) : null}
              />
              <DetailField
                label="Completed at"
                value={
                  maintenance.completedAt ? formatDateTime(maintenance.completedAt) : null
                }
              />
            </dl>
          </SectionCard>

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(maintenance.createdAt)} />
              <DetailField
                label="Last updated"
                value={formatDateTime(maintenance.updatedAt)}
              />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Inventory impact"
            description="Inventory movement details will appear here when inventory integration is connected."
          />

          <EmptyCard
            title="Accounting entries"
            description="Accounting impact will appear here when accounting integration is connected."
          />

          <EmptyCard
            title="Audit timeline"
            description="Audit trail details will appear here when available from the API."
          />
        </div>
      </div>

      <StartMaintenanceDialog
        maintenance={maintenance}
        open={startOpen}
        onOpenChange={setStartOpen}
      />

      <CompleteMaintenanceDialog
        maintenance={maintenance}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />

      <CancelMaintenanceDialog
        maintenance={maintenance}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => router.push(ROUTES.maintenance)}
      />
    </PageContainer>
  );
}
