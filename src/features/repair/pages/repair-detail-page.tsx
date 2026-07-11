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
import { RepairStatusBadge } from "../components/repair-status-badge";
import { RepairStatusTimeline } from "../components/repair-status-timeline";
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

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading repair details..." />
      </PageContainer>
    );
  }

  if (isError || !repair) {
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
    <PageContainer>
      <PageHeader
        title={repair.repairNumber}
        description={`Return: ${returnLabelById.get(repair.returnId) ?? repair.returnId}`}
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Quantity" value={repair.quantity} />
        <MetricCard label="Repair cost" value={formatCurrency(repair.repairCost)} />
        <MetricCard label="Repair date" value={formatDate(repair.repairDate)} />
        <MetricCard
          label="Status"
          value={<RepairStatusBadge status={repair.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Repair summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Repair number" value={repair.repairNumber} />
              <DetailField label="Repair date" value={formatDate(repair.repairDate)} />
              <DetailField label="Quantity" value={repair.quantity} />
              <DetailField label="Repair cost" value={formatCurrency(repair.repairCost)} />
              <DetailField label="Technician" value={repair.technician} />
              <DetailField label="Repair notes" value={repair.repairNotes} />
            </dl>
          </SectionCard>

          <SectionCard title="Related return">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Return number"
                value={returnRecord?.returnNumber ?? returnLabelById.get(repair.returnId)}
              />
              <DetailField
                label="Return date"
                value={returnRecord ? formatDate(returnRecord.returnDate) : null}
              />
              <div className="sm:col-span-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  render={<Link href={ROUTES.returnDetail(repair.returnId)} />}
                >
                  View return
                </AppButton>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Asset / product">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Product"
                value={productLabelById.get(repair.productId) ?? repair.productId}
              />
              <DetailField
                label="Warehouse"
                value={warehouseLabelById.get(repair.warehouseId) ?? repair.warehouseId}
              />
              <div className="sm:col-span-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  render={<Link href={ROUTES.productDetail(repair.productId)} />}
                >
                  View product
                </AppButton>
              </div>
            </dl>
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

          <EmptyCard
            title="Maintenance linkage"
            description="Maintenance records will appear here when the maintenance module is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status timeline"
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

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(repair.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(repair.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Inventory availability"
            description="Inventory availability details will appear here when inventory integration is connected."
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
