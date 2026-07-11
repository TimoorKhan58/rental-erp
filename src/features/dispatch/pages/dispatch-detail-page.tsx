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
import { formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import { useRentalOrder } from "@/features/rental-order/hooks";
import { useWarehouse } from "@/features/warehouse/hooks";
import {
  canCancelDispatch,
  canCompleteDispatch,
  canEditDispatch,
  canMarkDispatchReady,
  DELIVERY_METHOD_LABELS,
} from "../mappers";
import {
  useDispatch,
  useDispatchFilterOptions,
  useDispatchPermissions,
} from "../hooks";
import { DispatchStatusBadge } from "../components/dispatch-status-badge";
import { DispatchStatusTimeline } from "../components/dispatch-status-timeline";
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

export function DispatchDetailPage({ dispatchId }: DispatchDetailPageProps) {
  const router = useRouter();
  const { data: dispatch, isLoading, isError, error, refetch } = useDispatch(dispatchId);
  const { canUpdate, canComplete, canCancel } = useDispatchPermissions();
  const { productLabelById, rentalOrderLabelById, warehouseLabelById } =
    useDispatchFilterOptions();
  const { data: rentalOrder } = useRentalOrder(dispatch?.rentalOrderId ?? "");
  const { data: customer } = useCustomer(rentalOrder?.customerId ?? "");
  const { data: warehouse } = useWarehouse(rentalOrder?.warehouseId ?? "");

  const [markReadyOpen, setMarkReadyOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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

  const totalQuantity = dispatch.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <PageContainer>
      <PageHeader
        title={dispatch.dispatchNumber}
        description={`Rental order: ${rentalOrderLabelById.get(dispatch.rentalOrderId) ?? dispatch.rentalOrderId}`}
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Line items" value={dispatch.items.length} />
        <MetricCard label="Total quantity" value={totalQuantity} />
        <MetricCard
          label="Dispatch date"
          value={formatDate(dispatch.dispatchDate)}
        />
        <MetricCard
          label="Status"
          value={<DispatchStatusBadge status={dispatch.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Dispatch summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Dispatch number" value={dispatch.dispatchNumber} />
              <DetailField label="Dispatch date" value={formatDate(dispatch.dispatchDate)} />
              <DetailField
                label="Delivery method"
                value={DELIVERY_METHOD_LABELS[dispatch.deliveryMethod]}
              />
              <DetailField label="Delivery address" value={dispatch.deliveryAddress} />
              <DetailField label="Vehicle number" value={dispatch.vehicleNumber} />
              <DetailField label="Driver name" value={dispatch.driverName} />
              <DetailField label="Driver phone" value={dispatch.driverPhone} />
              <DetailField label="Remarks" value={dispatch.remarks} />
            </dl>
          </SectionCard>

          <SectionCard title="Related rental order">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Order number"
                value={rentalOrder?.orderNumber ?? rentalOrderLabelById.get(dispatch.rentalOrderId)}
              />
              <DetailField
                label="Rental period"
                value={
                  rentalOrder
                    ? `${formatDate(rentalOrder.startDate)} – ${formatDate(rentalOrder.endDate)}`
                    : null
                }
              />
              {rentalOrder ? (
                <div className="sm:col-span-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    render={<Link href={ROUTES.rentalOrderDetail(rentalOrder.id)} />}
                  >
                    View rental order
                  </AppButton>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Customer">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Customer" value={customer?.name} />
              <DetailField label="Customer code" value={customer?.customerCode} />
              <DetailField label="Phone" value={customer?.phone} />
              {customer ? (
                <div className="sm:col-span-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    render={<Link href={ROUTES.customerDetail(customer.id)} />}
                  >
                    View customer
                  </AppButton>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Warehouse">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Warehouse"
                value={warehouse?.name ?? warehouseLabelById.get(rentalOrder?.warehouseId ?? "")}
              />
              <DetailField label="Warehouse code" value={warehouse?.warehouseCode} />
              {warehouse ? (
                <div className="sm:col-span-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    render={<Link href={ROUTES.warehouseDetail(warehouse.id)} />}
                  >
                    View warehouse
                  </AppButton>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Line items">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium" scope="col">Product</th>
                    <th className="px-3 py-2 font-medium" scope="col">Quantity</th>
                    <th className="px-3 py-2 font-medium" scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatch.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {productLabelById.get(item.productId) ?? item.productId}
                      </td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <EmptyCard
            title="Inventory movement"
            description="Stock movement records will appear here when inventory integration is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status timeline"
            actions={<DispatchStatusBadge status={dispatch.status} />}
          >
            <DispatchStatusTimeline status={dispatch.status} />
          </SectionCard>

          <SectionCard title="Milestones">
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

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(dispatch.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(dispatch.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Return status"
            description="Return processing status will appear here when the returns module is connected."
          />

          <EmptyCard
            title="Audit timeline"
            description="Audit trail details will appear here when available from the API."
          />
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
