"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  Building2Icon,
  CalendarIcon,
  CheckIcon,
  ClipboardListIcon,
  ClockIcon,
  MapPinIcon,
  PencilIcon,
  PlayIcon,
  TruckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import { useRentalOrder } from "@/features/rental-order/hooks";
import { useWarehouse } from "@/features/warehouse/hooks";
import {
  canCancelDispatch,
  canCompleteDispatch,
  canEditDispatch,
  canMarkDispatchReady,
  DELIVERY_METHOD_LABELS,
  getDispatchTotalQuantity,
} from "../mappers";
import {
  useDispatch,
  useDispatchFilterOptions,
  useDispatchPermissions,
} from "../hooks";
import { DispatchStatusBadge } from "../components/dispatch-status-badge";
import { DispatchStatusTimeline } from "../components/dispatch-status-timeline";
import { DispatchWorkflowProgressBar } from "../components/dispatch-workflow-progress-bar";
import { DispatchLineItemsTable } from "../components/dispatch-line-items-table";
import { CancelDispatchDialog } from "../dialogs/cancel-dispatch-dialog";
import { CompleteDispatchDialog } from "../dialogs/complete-dispatch-dialog";
import { MarkReadyDispatchDialog } from "../dialogs/mark-ready-dispatch-dialog";

type DispatchDetailPageProps = {
  dispatchId: string;
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

export function DispatchDetailPage({ dispatchId }: DispatchDetailPageProps) {
  const router = useRouter();
  const { data: dispatch, isLoading, isError, error, refetch } = useDispatch(dispatchId);
  const { canUpdate, canComplete, canCancel } = useDispatchPermissions();
  const { productLabelById, productNameById, rentalOrderLabelById, warehouseLabelById } =
    useDispatchFilterOptions();
  const { data: rentalOrder } = useRentalOrder(dispatch?.rentalOrderId ?? "");
  const { data: customer } = useCustomer(rentalOrder?.customerId ?? "");
  const { data: warehouse } = useWarehouse(rentalOrder?.warehouseId ?? "");

  const [markReadyOpen, setMarkReadyOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const totalQuantity = useMemo(
    () => (dispatch ? getDispatchTotalQuantity(dispatch) : 0),
    [dispatch],
  );

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading dispatch details..." />
      </PageContainer>
    );
  }

  if (isError || !dispatch) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Dispatch not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested dispatch could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.dispatches} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const rentalOrderLabel =
    rentalOrder?.orderNumber ?? rentalOrderLabelById.get(dispatch.rentalOrderId);
  const warehouseName =
    warehouse?.name ?? warehouseLabelById.get(rentalOrder?.warehouseId ?? "");

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={dispatch.dispatchNumber}
        description={rentalOrderLabel ?? dispatch.rentalOrderId}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Deliveries", href: ROUTES.dispatches },
          { label: dispatch.dispatchNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.dispatches} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditDispatch(dispatch.status) ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.dispatchEdit(dispatch.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canUpdate && canMarkDispatchReady(dispatch.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<PlayIcon className="size-4" aria-hidden="true" />}
                onClick={() => setMarkReadyOpen(true)}
              >
                Mark ready
              </AppButton>
            ) : null}
            {canComplete && canCompleteDispatch(dispatch.status) ? (
              <AppButton
                leftIcon={<CheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setCompleteOpen(true)}
              >
                Complete
              </AppButton>
            ) : null}
            {canCancel && canCancelDispatch(dispatch.status) ? (
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
                <DispatchStatusBadge status={dispatch.status} />
                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {DELIVERY_METHOD_LABELS[dispatch.deliveryMethod]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Scheduled {formatDate(dispatch.dispatchDate)} · Last updated{" "}
                {formatDateTime(dispatch.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total units
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {totalQuantity.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Line items"
              value={dispatch.items.length.toLocaleString()}
              hint="Products on this delivery"
              icon={<ClipboardListIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Dispatch date"
              value={formatDate(dispatch.dispatchDate)}
              hint={DELIVERY_METHOD_LABELS[dispatch.deliveryMethod]}
              icon={<CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Driver"
              value={dispatch.driverName?.trim() || "—"}
              hint={dispatch.vehicleNumber ?? "No vehicle assigned"}
              icon={<TruckIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Warehouse"
              value={warehouseName || "—"}
              hint="Fulfillment location"
              icon={<Building2Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
          </div>

          {dispatch.status !== "CANCELLED" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Delivery workflow</span>
                <span className="text-muted-foreground">Draft → Ready → Dispatched → Completed</span>
              </div>
              <DispatchWorkflowProgressBar status={dispatch.status} size="md" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Line items">
            <DispatchLineItemsTable
              items={dispatch.items}
              productLabelById={productLabelById}
              productNameById={productNameById}
            />
          </SectionCard>

          <SectionCard title="Delivery details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Delivery address" value={dispatch.deliveryAddress} />
              <DetailField
                label="Delivery method"
                value={DELIVERY_METHOD_LABELS[dispatch.deliveryMethod]}
              />
              <DetailField label="Vehicle number" value={dispatch.vehicleNumber} />
              <DetailField label="Driver name" value={dispatch.driverName} />
              <DetailField label="Driver phone" value={dispatch.driverPhone} />
              <DetailField label="Remarks" value={dispatch.remarks} />
            </dl>
          </SectionCard>

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
            title="Customer"
            icon={<UsersIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-success-muted text-success"
            fields={[
              { label: "Name", value: customer?.name },
              { label: "Customer code", value: customer?.customerCode },
              { label: "Phone", value: customer?.phone },
              { label: "Address", value: customer?.address },
            ]}
            href={customer ? ROUTES.customerDetail(customer.id) : undefined}
            linkLabel="View customer"
          />

          <RelatedEntityCard
            title="Warehouse"
            icon={<Building2Icon className="size-5" aria-hidden="true" />}
            iconClass="bg-info/12 text-info"
            fields={[
              { label: "Name", value: warehouseName },
              { label: "Warehouse code", value: warehouse?.warehouseCode },
              { label: "Address", value: warehouse?.address },
            ]}
            href={warehouse ? ROUTES.warehouseDetail(warehouse.id) : undefined}
            linkLabel="View warehouse"
          />

          <EmptyCard
            title="Returns & inventory"
            description="Return processing and stock movement records will appear here when those modules are connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Delivery workflow"
            actions={<DispatchStatusBadge status={dispatch.status} />}
          >
            <DispatchStatusTimeline status={dispatch.status} />
          </SectionCard>

          <SectionCard
            title="Milestones"
            actions={<MapPinIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
          >
            <dl className="space-y-4">
              <DetailField
                label="Ready at"
                value={dispatch.readyAt ? formatDateTime(dispatch.readyAt) : null}
              />
              <DetailField
                label="Dispatched at"
                value={dispatch.dispatchedAt ? formatDateTime(dispatch.dispatchedAt) : null}
              />
              <DetailField
                label="Completed at"
                value={dispatch.completedAt ? formatDateTime(dispatch.completedAt) : null}
              />
            </dl>
          </SectionCard>

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(dispatch.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">{formatDateTime(dispatch.updatedAt)}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <MarkReadyDispatchDialog
        dispatch={dispatch}
        open={markReadyOpen}
        onOpenChange={setMarkReadyOpen}
      />

      <CompleteDispatchDialog
        dispatch={dispatch}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />

      <CancelDispatchDialog
        dispatch={dispatch}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => router.push(ROUTES.dispatches)}
      />
    </PageContainer>
  );
}
