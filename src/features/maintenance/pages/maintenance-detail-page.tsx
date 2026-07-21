"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  PackageIcon,
  PencilIcon,
  PlayIcon,
  SettingsIcon,
  UserIcon,
  WarehouseIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  canCancelMaintenance,
  canCompleteMaintenance,
  canEditMaintenance,
  canStartMaintenance,
  getMaintenanceDisplayCost,
  SERVICE_TYPE_LABELS,
} from "../mappers";
import {
  useMaintenance,
  useMaintenanceFilterOptions,
  useMaintenancePermissions,
} from "../hooks";
import { MaintenanceAssetDetailsTable } from "../components/maintenance-asset-details-table";
import { MaintenanceStatusBadge } from "../components/maintenance-status-badge";
import { MaintenanceStatusTimeline } from "../components/maintenance-status-timeline";
import { MaintenanceWorkflowProgressBar } from "../components/maintenance-workflow-progress-bar";
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

function MetricTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RelatedEntityCard({
  title,
  icon,
  iconClass,
  fields,
  href,
  linkLabel,
}: {
  title: string;
  icon: React.ReactNode;
  iconClass: string;
  fields: Array<{ label: string; value: string | null | undefined }>;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              iconClass,
            )}
          >
            {icon}
          </div>
          <dl className="grid flex-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <DetailField key={field.label} label={field.label} value={field.value} />
            ))}
          </dl>
        </div>
        {href && linkLabel ? (
          <AppButton
            variant="outline"
            size="sm"
            rightIcon={<ArrowUpRightIcon className="size-3.5" aria-hidden="true" />}
            render={<Link href={href} />}
          >
            {linkLabel}
          </AppButton>
        ) : null}
      </div>
    </SectionCard>
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

  const labels = useMemo(() => {
    if (!maintenance) {
      return null;
    }

    return {
      productLabel: productLabelById.get(maintenance.productId) ?? maintenance.productId,
      warehouseLabel: warehouseLabelById.get(maintenance.warehouseId) ?? maintenance.warehouseId,
      displayCost: getMaintenanceDisplayCost(maintenance),
    };
  }, [maintenance, productLabelById, warehouseLabelById]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading maintenance details..." />
      </PageContainer>
    );
  }

  if (isError || !maintenance || !labels) {
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

  const costLabel =
    maintenance.status === "COMPLETED" && maintenance.actualCost > 0
      ? "Actual cost"
      : "Estimated cost";

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={maintenance.maintenanceNumber}
        description={`${SERVICE_TYPE_LABELS[maintenance.serviceType]} · ${labels.productLabel}`}
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

      <Card className="overflow-hidden border-border/60 shadow-soft">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <MaintenanceStatusBadge status={maintenance.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Scheduled {formatDate(maintenance.scheduledDate)} · Last updated{" "}
                {formatDateTime(maintenance.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {costLabel}
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(labels.displayCost)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Quantity"
              value={maintenance.quantity.toLocaleString()}
              hint="Units under maintenance"
              icon={<PackageIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Scheduled date"
              value={formatDate(maintenance.scheduledDate)}
              hint="Planned service date"
              icon={<CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Service type"
              value={SERVICE_TYPE_LABELS[maintenance.serviceType]}
              hint="Type of maintenance"
              icon={<SettingsIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Technician"
              value={maintenance.technician ?? maintenance.vendor ?? "Unassigned"}
              hint={maintenance.vendor ? "External vendor" : "Assigned technician"}
              icon={<UserIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
          </div>

          {maintenance.status !== "CANCELLED" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Maintenance workflow</span>
                <span className="text-muted-foreground">Scheduled → In progress → Completed</span>
              </div>
              <MaintenanceWorkflowProgressBar status={maintenance.status} size="md" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Maintenance asset">
            <MaintenanceAssetDetailsTable
              maintenance={maintenance}
              productLabel={labels.productLabel}
              warehouseLabel={labels.warehouseLabel}
            />
          </SectionCard>

          {maintenance.notes ? (
            <SectionCard title="Notes">
              <p className="text-sm text-muted-foreground">{maintenance.notes}</p>
            </SectionCard>
          ) : null}

          <SectionCard title="Cost summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Estimated cost"
                value={formatCurrency(maintenance.estimatedCost)}
              />
              <DetailField label="Actual cost" value={formatCurrency(maintenance.actualCost)} />
              {maintenance.status === "COMPLETED" && maintenance.actualCost > 0 ? (
                <DetailField
                  label="Variance"
                  value={formatCurrency(maintenance.actualCost - maintenance.estimatedCost)}
                />
              ) : null}
            </dl>
          </SectionCard>

          <RelatedEntityCard
            title="Product"
            icon={<PackageIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-primary/12 text-primary"
            fields={[
              { label: "Product", value: labels.productLabel },
              { label: "Warehouse", value: labels.warehouseLabel },
            ]}
            href={ROUTES.productDetail(maintenance.productId)}
            linkLabel="View product"
          />

          <RelatedEntityCard
            title="Inventory"
            icon={<WarehouseIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-info/12 text-info"
            fields={[
              { label: "Inventory record", value: maintenance.inventoryId },
              { label: "Quantity", value: maintenance.quantity.toLocaleString() },
            ]}
            href={ROUTES.inventoryDetail(maintenance.inventoryId)}
            linkLabel="View inventory"
          />

          <EmptyCard
            title="Repair history"
            description="Related repair records will appear here when repair integration is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Maintenance workflow"
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

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(maintenance.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">{formatDateTime(maintenance.updatedAt)}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <EmptyCard
            title="Inventory impact"
            description="Inventory movement details will appear here when inventory integration is connected."
          />

          <EmptyCard
            title="Accounting entries"
            description="Accounting impact will appear here when accounting integration is connected."
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
