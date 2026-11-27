"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  Building2Icon,
  CalendarRangeIcon,
  ClockIcon,
  PencilIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { RentalOrderBillingSection } from "@/features/rental-invoice/components";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import { useWarehouse } from "@/features/warehouse/hooks";
import {
  calculateOrderTotalFromItems,
  calculateOrderRentalDays,
  canCancelRentalOrder,
  canConfirmRentalOrder,
  canEditRentalOrder,
  canReserveRentalOrder,
  deriveReservationStatus,
  getOrderReservedUnits,
} from "../mappers";
import {
  useRentalOrder,
  useRentalOrderFilterOptions,
  useRentalOrderPermissions,
} from "../hooks";
import { RentalOrderStatusBadge } from "../components/rental-order-status-badge";
import { RentalReservationBadge } from "../components/rental-reservation-badge";
import { RentalOrderReservationProgressBar } from "../components/rental-order-reservation-progress-bar";
import { RentalOrderLifecycleStrip } from "../components/rental-order-lifecycle-strip";
import { RentalOrderNextStep, getRentalOrderNextStep } from "../components/rental-order-next-step";
import { RentalOrderLineItemsTable } from "../components/rental-order-line-items-table";
import { RentalOrderShortfallSection } from "../components/rental-order-shortfall-section";
import { RentalOrderDispatchesSection } from "@/features/dispatch/components";
import { RentalOrderReturnsSection } from "@/features/return/components";
import { CancelRentalOrderDialog } from "../dialogs/cancel-rental-order-dialog";
import { ConfirmRentalOrderDialog } from "../dialogs/confirm-rental-order-dialog";
import { ReserveRentalOrderDialog } from "../dialogs/reserve-rental-order-dialog";

type RentalOrderDetailPageProps = {
  orderId: string;
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
    <div className="rounded-md border border-border bg-muted/20 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[length:var(--text-caption)] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="font-heading text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[length:var(--text-caption)] text-muted-foreground">{hint}</p> : null}
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

export function RentalOrderDetailPage({ orderId }: RentalOrderDetailPageProps) {
  const router = useRouter();
  const { data: order, isLoading, isError, error, refetch } = useRentalOrder(orderId);
  const { canUpdate, canConfirm, canReserve, canCancel } = useRentalOrderPermissions();
  const { productLabelById, productNameById, customerLabelById, warehouseLabelById } =
    useRentalOrderFilterOptions();
  const { data: customer } = useCustomer(order?.customerId ?? "");
  const { data: warehouse } = useWarehouse(order?.warehouseId ?? "");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const metrics = useMemo(() => {
    if (!order) {
      return null;
    }

    const rentalDays = calculateOrderRentalDays(order);
    const orderTotal = calculateOrderTotalFromItems(order.items);
    const { reserved, total } = getOrderReservedUnits(order);

    return {
      rentalDays,
      orderTotal,
      reserved,
      total,
      reservationStatus: deriveReservationStatus(order),
    };
  }, [order]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading rental order details..." />
      </PageContainer>
    );
  }

  if (isError || !order || !metrics) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Rental order not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested rental order could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.rentalOrders} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const nextStep = getRentalOrderNextStep(order);
  // Reservation details only matter until the items are sent out.
  const isPreparing = ["DRAFT", "CONFIRMED", "RESERVED"].includes(order.status);
  const customerName = customer?.name ?? customerLabelById.get(order.customerId) ?? order.customerId;
  const warehouseName =
    warehouse?.name ?? warehouseLabelById.get(order.warehouseId) ?? order.warehouseId;

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={customerName}
        description={`Order ${order.orderNumber}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Orders", href: ROUTES.rentalOrders },
          { label: order.orderNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.rentalOrders} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditRentalOrder(order.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.rentalOrderEdit(order.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canCancel && canCancelRentalOrder(order.status, order.items) ? (
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

      <Card className="overflow-hidden border-border">
        <CardContent className="space-y-5 p-4 md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <RentalOrderStatusBadge status={order.status} />
                <RentalReservationBadge status={metrics.reservationStatus} />
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(order.startDate)} – {formatDate(order.endDate)} · Last updated{" "}
                {formatDateTime(order.updatedAt)}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[length:var(--text-caption)] font-medium uppercase tracking-wide text-muted-foreground">
                Order value
              </p>
              <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
                {formatCurrency(metrics.orderTotal)}
              </p>
            </div>
          </div>

          <RentalOrderLifecycleStrip status={order.status} />

          <RentalOrderNextStep
            step={nextStep}
            allowed={
              nextStep.action?.kind === "confirm"
                ? canConfirm && canConfirmRentalOrder(order.status)
                : nextStep.action?.kind === "reserve"
                  ? canReserve && canReserveRentalOrder(order.status)
                  : true
            }
            onConfirm={() => setConfirmOpen(true)}
            onReserve={() => setReserveOpen(true)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile
              label="Rental period"
              value={`${metrics.rentalDays} day${metrics.rentalDays === 1 ? "" : "s"}`}
              hint={`${formatDate(order.startDate)} – ${formatDate(order.endDate)}`}
              icon={<CalendarRangeIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            {isPreparing ? (
              <MetricTile
                label="Stock held"
                value={`${metrics.reserved} of ${metrics.total}`}
                hint="Items kept aside for this order"
              />
            ) : (
              <MetricTile
                label="Items"
                value={`${metrics.total}`}
                hint={`${order.items.length} product${order.items.length === 1 ? "" : "s"} on this order`}
              />
            )}
          </div>

          {isPreparing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Stock held so far</span>
                <span className="tabular-nums text-muted-foreground">
                  {metrics.reserved.toLocaleString()} of {metrics.total.toLocaleString()} units
                </span>
              </div>
              <RentalOrderReservationProgressBar
                reserved={metrics.reserved}
                total={metrics.total}
                size="md"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="app-grid">
        <div className="min-w-0 space-y-6 sm:col-span-6 lg:col-span-8">
          <SectionCard title="Line items">
            <RentalOrderLineItemsTable
              items={order.items}
              productLabelById={productLabelById}
              productNameById={productNameById}
            />
          </SectionCard>

          {isPreparing ? (
            <RentalOrderShortfallSection
              orderId={order.id}
              orderNumber={order.orderNumber}
              productLabelById={productLabelById}
            />
          ) : null}

          <RentalOrderDispatchesSection rentalOrderId={order.id} orderStatus={order.status} />

          <RentalOrderReturnsSection rentalOrderId={order.id} orderStatus={order.status} />

          <RentalOrderBillingSection
            rentalOrderId={order.id}
            rentalOrderStatus={order.status}
            canGenerate={order.status === "COMPLETED"}
          />

          {order.remarks ? (
            <SectionCard title="Remarks">
              <p className="text-sm text-muted-foreground">{order.remarks}</p>
            </SectionCard>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6 sm:col-span-6 lg:col-span-4">
          <RelatedEntityCard
            title="Customer"
            icon={<UsersIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-primary/12 text-primary"
            fields={[
              { label: "Name", value: customerName },
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
            iconClass="bg-success-muted text-success"
            fields={[
              { label: "Name", value: warehouseName },
              { label: "Warehouse code", value: warehouse?.warehouseCode },
              { label: "Address", value: warehouse?.address },
            ]}
            href={warehouse ? ROUTES.warehouseDetail(warehouse.id) : undefined}
            linkLabel="View warehouse"
          />

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">{formatDateTime(order.updatedAt)}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <ConfirmRentalOrderDialog order={order} open={confirmOpen} onOpenChange={setConfirmOpen} />

      <ReserveRentalOrderDialog order={order} open={reserveOpen} onOpenChange={setReserveOpen} />

      <CancelRentalOrderDialog
        order={order}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => router.push(ROUTES.rentalOrders)}
      />
    </PageContainer>
  );
}
