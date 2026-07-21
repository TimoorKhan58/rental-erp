"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClockIcon,
  PackageIcon,
  PencilIcon,
  TruckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { RentalOrderBillingSection } from "@/features/rental-invoice/components";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import { useRentalOrder } from "@/features/rental-order/hooks";
import {
  canCancelReturn,
  canCompleteReturn,
  canEditReturn,
  canInspectReturn,
  canReceiveReturn,
  getReturnDamageTotals,
  getReturnTotalQuantity,
  hasReturnInspection,
} from "../mappers";
import {
  useReturn,
  useReturnFilterOptions,
  useReturnPermissions,
} from "../hooks";
import { ReturnStatusBadge } from "../components/return-status-badge";
import { ReturnStatusTimeline } from "../components/return-status-timeline";
import { ReturnWorkflowProgressBar } from "../components/return-workflow-progress-bar";
import { ReturnLineItemsTable } from "../components/return-line-items-table";
import { CancelReturnDialog } from "../dialogs/cancel-return-dialog";
import { CompleteReturnDialog } from "../dialogs/complete-return-dialog";
import { InspectReturnDialog } from "../dialogs/inspect-return-dialog";
import { ReceiveReturnDialog } from "../dialogs/receive-return-dialog";

type ReturnDetailPageProps = {
  returnId: string;
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

export function ReturnDetailPage({ returnId }: ReturnDetailPageProps) {
  const router = useRouter();
  const { data: returnRecord, isLoading, isError, error, refetch } = useReturn(returnId);
  const { canUpdate, canReceive, canInspect, canComplete, canCancel } = useReturnPermissions();
  const { rentalOrderLabelById, dispatchLabelById, rentalOrderItemLabelById } =
    useReturnFilterOptions();
  const { data: rentalOrder } = useRentalOrder(returnRecord?.rentalOrderId ?? "");
  const { data: customer } = useCustomer(rentalOrder?.customerId ?? "");

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const metrics = useMemo(() => {
    if (!returnRecord) {
      return null;
    }

    const totalReturned = getReturnTotalQuantity(returnRecord);
    const damageTotals = getReturnDamageTotals(returnRecord);
    const showInspection = hasReturnInspection(returnRecord);

    return {
      totalReturned,
      damageTotals,
      showInspection,
    };
  }, [returnRecord]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading return details..." />
      </PageContainer>
    );
  }

  if (isError || !returnRecord || !metrics) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Return not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested return could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.returns} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const rentalOrderLabel =
    rentalOrder?.orderNumber ?? rentalOrderLabelById.get(returnRecord.rentalOrderId);
  const dispatchLabel = dispatchLabelById.get(returnRecord.dispatchId);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={returnRecord.returnNumber}
        description={rentalOrderLabel ?? returnRecord.rentalOrderId}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Returns", href: ROUTES.returns },
          { label: returnRecord.returnNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.returns} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditReturn(returnRecord.status) ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.returnEdit(returnRecord.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canReceive && canReceiveReturn(returnRecord.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<PackageIcon className="size-4" aria-hidden="true" />}
                onClick={() => setReceiveOpen(true)}
              >
                Mark received
              </AppButton>
            ) : null}
            {canInspect && canInspectReturn(returnRecord.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<ClipboardCheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setInspectOpen(true)}
              >
                Inspect
              </AppButton>
            ) : null}
            {canComplete && canCompleteReturn(returnRecord.status) ? (
              <AppButton
                leftIcon={<CheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setCompleteOpen(true)}
              >
                Complete
              </AppButton>
            ) : null}
            {canCancel && canCancelReturn(returnRecord.status) ? (
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
                <ReturnStatusBadge status={returnRecord.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Returned {formatDate(returnRecord.returnDate)} · Last updated{" "}
                {formatDateTime(returnRecord.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total returned
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {metrics.totalReturned.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Line items"
              value={returnRecord.items.length.toLocaleString()}
              hint="Products on this return"
              icon={<ClipboardListIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Return date"
              value={formatDate(returnRecord.returnDate)}
              hint="Date assets were returned"
              icon={<CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Dispatch"
              value={dispatchLabel ?? "—"}
              hint="Source delivery"
              icon={<TruckIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Inspection"
              value={
                metrics.showInspection
                  ? `${metrics.damageTotals.damaged + metrics.damageTotals.lost} issues`
                  : "Pending"
              }
              hint={
                metrics.showInspection
                  ? `${metrics.damageTotals.good} good units`
                  : "Not yet inspected"
              }
            />
          </div>

          {returnRecord.status !== "CANCELLED" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Return workflow</span>
                <span className="text-muted-foreground">
                  Draft → Received → Inspected → Completed
                </span>
              </div>
              <ReturnWorkflowProgressBar status={returnRecord.status} size="md" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Returned items">
            <ReturnLineItemsTable
              items={returnRecord.items}
              itemLabelById={rentalOrderItemLabelById}
              showInspection={metrics.showInspection}
            />
          </SectionCard>

          {metrics.showInspection ? (
            <SectionCard title="Damage assessment">
              <dl className="grid gap-4 sm:grid-cols-3">
                <DetailField label="Good condition" value={metrics.damageTotals.good} />
                <DetailField label="Damaged" value={metrics.damageTotals.damaged} />
                <DetailField label="Lost" value={metrics.damageTotals.lost} />
              </dl>
            </SectionCard>
          ) : null}

          {returnRecord.remarks ? (
            <SectionCard title="Remarks">
              <p className="text-sm text-muted-foreground">{returnRecord.remarks}</p>
            </SectionCard>
          ) : null}

          <RelatedEntityCard
            title="Rental order"
            icon={<ClipboardListIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-primary/12 text-primary"
            fields={[
              { label: "Order number", value: rentalOrderLabel },
              {
                label: "Rental period",
                value: rentalOrder
                  ? `${formatDate(rentalOrder.startDate)} – ${formatDate(rentalOrder.endDate)}`
                  : null,
              },
            ]}
            href={rentalOrder ? ROUTES.rentalOrderDetail(rentalOrder.id) : undefined}
            linkLabel="View rental order"
          />

          <RelatedEntityCard
            title="Dispatch"
            icon={<TruckIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-info/12 text-info"
            fields={[{ label: "Dispatch number", value: dispatchLabel }]}
            href={ROUTES.dispatchDetail(returnRecord.dispatchId)}
            linkLabel="View dispatch"
          />

          <RelatedEntityCard
            title="Customer"
            icon={<UsersIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-success-muted text-success"
            fields={[
              { label: "Name", value: customer?.name },
              { label: "Customer code", value: customer?.customerCode },
              { label: "Phone", value: customer?.phone },
            ]}
            href={customer ? ROUTES.customerDetail(customer.id) : undefined}
            linkLabel="View customer"
          />

          <EmptyCard
            title="Follow-up workflows"
            description="Repair requests and maintenance records will appear here when those modules are connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Return workflow"
            actions={<ReturnStatusBadge status={returnRecord.status} />}
          >
            <ReturnStatusTimeline status={returnRecord.status} />
          </SectionCard>

          <SectionCard title="Milestones">
            <dl className="space-y-4">
              <DetailField
                label="Received at"
                value={returnRecord.receivedAt ? formatDateTime(returnRecord.receivedAt) : null}
              />
              <DetailField
                label="Inspected at"
                value={returnRecord.inspectedAt ? formatDateTime(returnRecord.inspectedAt) : null}
              />
              <DetailField
                label="Completed at"
                value={returnRecord.completedAt ? formatDateTime(returnRecord.completedAt) : null}
              />
            </dl>
          </SectionCard>

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(returnRecord.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">{formatDateTime(returnRecord.updatedAt)}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <RentalOrderBillingSection
            rentalOrderId={returnRecord.rentalOrderId}
            canGenerate={returnRecord.status === "COMPLETED"}
          />
        </div>
      </div>

      <ReceiveReturnDialog
        returnRecord={returnRecord}
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
      />

      <InspectReturnDialog
        returnRecord={returnRecord}
        open={inspectOpen}
        onOpenChange={setInspectOpen}
      />

      <CompleteReturnDialog
        returnRecord={returnRecord}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />

      <CancelReturnDialog
        returnRecord={returnRecord}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => router.push(ROUTES.returns)}
      />
    </PageContainer>
  );
}
