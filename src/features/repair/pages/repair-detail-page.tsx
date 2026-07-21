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
  UserIcon,
  WrenchIcon,
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
import { useReturn } from "@/features/return/hooks";
import {
  canCancelRepair,
  canCompleteRepair,
  canEditRepair,
  canStartRepair,
} from "../mappers";
import {
  useRepair,
  useRepairFilterOptions,
  useRepairPermissions,
} from "../hooks";
import { RepairAssetDetailsTable } from "../components/repair-asset-details-table";
import { RepairStatusBadge } from "../components/repair-status-badge";
import { RepairStatusTimeline } from "../components/repair-status-timeline";
import { RepairWorkflowProgressBar } from "../components/repair-workflow-progress-bar";
import { CancelRepairDialog } from "../dialogs/cancel-repair-dialog";
import { CompleteRepairDialog } from "../dialogs/complete-repair-dialog";
import { StartRepairDialog } from "../dialogs/start-repair-dialog";

type RepairDetailPageProps = {
  repairId: string;
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

export function RepairDetailPage({ repairId }: RepairDetailPageProps) {
  const router = useRouter();
  const { data: repair, isLoading, isError, error, refetch } = useRepair(repairId);
  const { canUpdate, canStart, canComplete, canCancel } = useRepairPermissions();
  const { returnLabelById, productLabelById, warehouseLabelById } = useRepairFilterOptions();
  const { data: returnRecord } = useReturn(repair?.returnId ?? "");

  const returnItem = returnRecord?.items.find((item) => item.id === repair?.returnItemId);

  const [startOpen, setStartOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const labels = useMemo(() => {
    if (!repair) {
      return null;
    }

    return {
      returnLabel: returnRecord?.returnNumber ?? returnLabelById.get(repair.returnId),
      productLabel: productLabelById.get(repair.productId) ?? repair.productId,
      warehouseLabel: warehouseLabelById.get(repair.warehouseId) ?? repair.warehouseId,
    };
  }, [repair, returnRecord, returnLabelById, productLabelById, warehouseLabelById]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading repair details..." />
      </PageContainer>
    );
  }

  if (isError || !repair || !labels) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Repair not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested repair could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.repairs} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={repair.repairNumber}
        description={labels.returnLabel ?? repair.returnId}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Repairs", href: ROUTES.repairs },
          { label: repair.repairNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.repairs} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditRepair(repair.status) ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.repairEdit(repair.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canStart && canStartRepair(repair.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<PlayIcon className="size-4" aria-hidden="true" />}
                onClick={() => setStartOpen(true)}
              >
                Start
              </AppButton>
            ) : null}
            {canComplete && canCompleteRepair(repair.status) ? (
              <AppButton
                leftIcon={<CheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setCompleteOpen(true)}
              >
                Complete
              </AppButton>
            ) : null}
            {canCancel && canCancelRepair(repair.status) ? (
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
                <RepairStatusBadge status={repair.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Scheduled {formatDate(repair.repairDate)} · Last updated{" "}
                {formatDateTime(repair.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Repair cost
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(repair.repairCost)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Quantity"
              value={repair.quantity.toLocaleString()}
              hint="Units being repaired"
              icon={<PackageIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Repair date"
              value={formatDate(repair.repairDate)}
              hint="Scheduled repair date"
              icon={<CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Technician"
              value={repair.technician ?? "Unassigned"}
              hint="Assigned repair technician"
              icon={<UserIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Product"
              value={labels.productLabel}
              hint="Asset under repair"
              icon={<WrenchIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
          </div>

          {repair.status !== "CANCELLED" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Repair workflow</span>
                <span className="text-muted-foreground">Pending → In progress → Completed</span>
              </div>
              <RepairWorkflowProgressBar status={repair.status} size="md" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Repair asset">
            <RepairAssetDetailsTable
              repair={repair}
              productLabel={labels.productLabel}
              warehouseLabel={labels.warehouseLabel}
            />
          </SectionCard>

          {returnItem ? (
            <SectionCard title="Damage assessment">
              <dl className="grid gap-4 sm:grid-cols-3">
                <DetailField label="Damaged quantity" value={returnItem.damagedQuantity} />
                <DetailField label="Good quantity" value={returnItem.goodQuantity} />
                <DetailField label="Lost quantity" value={returnItem.lostQuantity} />
                <DetailField label="Item notes" value={returnItem.notes} />
              </dl>
            </SectionCard>
          ) : null}

          {repair.repairNotes ? (
            <SectionCard title="Repair notes">
              <p className="text-sm text-muted-foreground">{repair.repairNotes}</p>
            </SectionCard>
          ) : null}

          <RelatedEntityCard
            title="Related return"
            icon={<PackageIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-primary/12 text-primary"
            fields={[
              { label: "Return number", value: labels.returnLabel },
              {
                label: "Return date",
                value: returnRecord ? formatDate(returnRecord.returnDate) : null,
              },
            ]}
            href={ROUTES.returnDetail(repair.returnId)}
            linkLabel="View return"
          />

          <RelatedEntityCard
            title="Product"
            icon={<WrenchIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-info/12 text-info"
            fields={[
              { label: "Product", value: labels.productLabel },
              { label: "Warehouse", value: labels.warehouseLabel },
            ]}
            href={ROUTES.productDetail(repair.productId)}
            linkLabel="View product"
          />

          <EmptyCard
            title="Maintenance linkage"
            description="Maintenance records will appear here when the maintenance module is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Repair workflow"
            actions={<RepairStatusBadge status={repair.status} />}
          >
            <RepairStatusTimeline status={repair.status} />
          </SectionCard>

          <SectionCard title="Milestones">
            <dl className="space-y-4">
              <DetailField
                label="Started at"
                value={repair.startedAt ? formatDateTime(repair.startedAt) : null}
              />
              <DetailField
                label="Completed at"
                value={repair.completedAt ? formatDateTime(repair.completedAt) : null}
              />
            </dl>
          </SectionCard>

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(repair.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">{formatDateTime(repair.updatedAt)}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <EmptyCard
            title="Inventory availability"
            description="Inventory availability details will appear here when inventory integration is connected."
          />

          <EmptyCard
            title="Accounting entries"
            description="Accounting impact will appear here when accounting integration is connected."
          />
        </div>
      </div>

      <StartRepairDialog
        repair={repair}
        open={startOpen}
        onOpenChange={setStartOpen}
      />

      <CompleteRepairDialog
        repair={repair}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />

      <CancelRepairDialog
        repair={repair}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => router.push(ROUTES.repairs)}
      />
    </PageContainer>
  );
}
