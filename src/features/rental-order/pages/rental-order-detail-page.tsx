"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  PackageIcon,
  PencilIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard, MetricCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useCustomer } from "@/features/customer/hooks";
import { useWarehouse } from "@/features/warehouse/hooks";
import {
  calculateLineSubtotal,
  calculateOrderTotal,
  calculateRentalDays,
  canCancelRentalOrder,
  canConfirmRentalOrder,
  canEditRentalOrder,
  canReserveRentalOrder,
  deriveReservationStatus,
  getRemainingReserveQuantity,
} from "../mappers";
import {
  useRentalOrder,
  useRentalOrderFilterOptions,
  useRentalOrderPermissions,
} from "../hooks";
import { RentalOrderStatusBadge } from "../components/rental-order-status-badge";
import { RentalOrderStatusTimeline } from "../components/rental-order-status-timeline";
import { RentalReservationBadge } from "../components/rental-reservation-badge";
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

export function RentalOrderDetailPage({ orderId }: RentalOrderDetailPageProps) {
  const router = useRouter();
  const { data: order, isLoading, isError, error, refetch } = useRentalOrder(orderId);
  const { canUpdate, canConfirm, canReserve, canCancel } = useRentalOrderPermissions();
  const { productLabelById, customerLabelById, warehouseLabelById } =
    useRentalOrderFilterOptions();
  const { data: customer } = useCustomer(order?.customerId ?? "");
  const { data: warehouse } = useWarehouse(order?.warehouseId ?? "");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading rental order details..." />
      </PageContainer>
    );
  }

  if (isError || !order) {
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

  const rentalDays = calculateRentalDays(order.startDate, order.endDate);
  const orderTotal = calculateOrderTotal(order.items, rentalDays);
  const totalReserved = order.items.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const totalOrdered = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const reservationStatus = deriveReservationStatus(order);

  return (
    <PageContainer>
      <PageHeader
        title={order.orderNumber}
        description={`Customer: ${customerLabelById.get(order.customerId) ?? order.customerId}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Rental Orders", href: ROUTES.rentalOrders },
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
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.rentalOrderEdit(order.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canConfirm && canConfirmRentalOrder(order.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<CheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setConfirmOpen(true)}
              >
                Confirm
              </AppButton>
            ) : null}
            {canReserve && canReserveRentalOrder(order.status) ? (
              <AppButton
                leftIcon={<PackageIcon className="size-4" aria-hidden="true" />}
                onClick={() => setReserveOpen(true)}
              >
                Reserve inventory
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Order total" value={formatCurrency(orderTotal)} />
        <MetricCard
          label="Rental period"
          value={`${rentalDays} day${rentalDays === 1 ? "" : "s"}`}
          hint={`${formatDate(order.startDate)} – ${formatDate(order.endDate)}`}
        />
        <MetricCard
          label="Reserved"
          value={`${totalReserved} / ${totalOrdered}`}
          hint="Units reserved vs ordered"
        />
        <MetricCard
          label="Status"
          value={<RentalOrderStatusBadge status={order.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Order summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Order number" value={order.orderNumber} />
              <DetailField label="Rental start" value={formatDate(order.startDate)} />
              <DetailField label="Rental end" value={formatDate(order.endDate)} />
              <DetailField label="Remarks" value={order.remarks} />
            </dl>
          </SectionCard>

          <SectionCard title="Customer">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Customer" value={customer?.name ?? customerLabelById.get(order.customerId)} />
              <DetailField label="Customer code" value={customer?.customerCode} />
              <DetailField label="Phone" value={customer?.phone} />
              <DetailField label="Address" value={customer?.address} />
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
              <DetailField label="Warehouse" value={warehouse?.name ?? warehouseLabelById.get(order.warehouseId)} />
              <DetailField label="Warehouse code" value={warehouse?.warehouseCode} />
              <DetailField label="Address" value={warehouse?.address} />
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
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium" scope="col">Product</th>
                    <th className="px-3 py-2 font-medium" scope="col">Quantity</th>
                    <th className="px-3 py-2 font-medium" scope="col">Reserved</th>
                    <th className="px-3 py-2 font-medium" scope="col">Remaining</th>
                    <th className="px-3 py-2 font-medium text-right" scope="col">Daily rate</th>
                    <th className="px-3 py-2 font-medium text-right" scope="col">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {productLabelById.get(item.productId) ?? item.productId}
                      </td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.reservedQuantity}</td>
                      <td className="px-3 py-2">{getRemainingReserveQuantity(item)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.dailyRate)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(calculateLineSubtotal(item, rentalDays))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/20">
                    <td colSpan={5} className="px-3 py-2 text-right font-medium">
                      Order total ({rentalDays} days)
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatCurrency(orderTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Pricing summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Rental days" value={rentalDays} />
              <DetailField label="Order total" value={formatCurrency(orderTotal)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Dispatch summary"
            description="Dispatch records will appear here when the dispatch module is connected."
          />

          <EmptyCard
            title="Return summary"
            description="Return and inspection records will appear here when the returns module is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status timeline"
            actions={<RentalOrderStatusBadge status={order.status} />}
          >
            <RentalOrderStatusTimeline status={order.status} />
          </SectionCard>

          <SectionCard
            title="Reservation status"
            actions={<RentalReservationBadge status={reservationStatus} />}
          >
            <dl className="space-y-4">
              <DetailField
                label="Units reserved"
                value={`${totalReserved} of ${totalOrdered}`}
              />
              <DetailField label="Order status" value={order.status} />
            </dl>
          </SectionCard>

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(order.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(order.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Invoice summary"
            description="Rental invoice details will appear here when the rental invoice module is connected."
          />

          <EmptyCard
            title="Payment summary"
            description="Payment history will appear here when the payments module is connected."
          />

          <EmptyCard
            title="Audit timeline"
            description="Audit trail details will appear here when available from the API."
          />
        </div>
      </div>

      <ConfirmRentalOrderDialog
        order={order}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      />

      <ReserveRentalOrderDialog
        order={order}
        open={reserveOpen}
        onOpenChange={setReserveOpen}
      />

      <CancelRentalOrderDialog
        order={order}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => router.push(ROUTES.rentalOrders)}
      />
    </PageContainer>
  );
}
