"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardCheckIcon,
  PencilIcon,
  PackageIcon,
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
import {
  canCancelReturn,
  canCompleteReturn,
  canEditReturn,
  canInspectReturn,
  canReceiveReturn,
} from "../mappers";
import {
  useReturn,
  useReturnFilterOptions,
  useReturnPermissions,
} from "../hooks";
import { ReturnStatusBadge } from "../components/return-status-badge";
import { ReturnStatusTimeline } from "../components/return-status-timeline";
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

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading return details..." />
      </PageContainer>
    );
  }

  if (isError || !returnRecord) {
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

  const totalReturned = returnRecord.items.reduce(
    (sum, item) => sum + item.returnedQuantity,
    0,
  );
  const totalDamaged = returnRecord.items.reduce(
    (sum, item) => sum + item.damagedQuantity,
    0,
  );
  const totalLost = returnRecord.items.reduce((sum, item) => sum + item.lostQuantity, 0);
  const hasInspection =
    returnRecord.status === "INSPECTED" ||
    returnRecord.status === "COMPLETED" ||
    returnRecord.inspectedAt !== null;

  return (
    <PageContainer>
      <PageHeader
        title={returnRecord.returnNumber}
        description={`Rental order: ${rentalOrderLabelById.get(returnRecord.rentalOrderId) ?? returnRecord.rentalOrderId}`}
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Returned items" value={returnRecord.items.length} />
        <MetricCard label="Total returned qty" value={totalReturned} />
        <MetricCard label="Return date" value={formatDate(returnRecord.returnDate)} />
        <MetricCard
          label="Status"
          value={<ReturnStatusBadge status={returnRecord.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Return summary">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Return number" value={returnRecord.returnNumber} />
              <DetailField label="Return date" value={formatDate(returnRecord.returnDate)} />
              <DetailField label="Remarks" value={returnRecord.remarks} />
            </dl>
          </SectionCard>

          <SectionCard title="Related rental order">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Order number"
                value={
                  rentalOrder?.orderNumber ??
                  rentalOrderLabelById.get(returnRecord.rentalOrderId)
                }
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

          <SectionCard title="Related dispatch">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Dispatch number"
                value={dispatchLabelById.get(returnRecord.dispatchId)}
              />
              <div className="sm:col-span-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  render={<Link href={ROUTES.dispatchDetail(returnRecord.dispatchId)} />}
                >
                  View dispatch
                </AppButton>
              </div>
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

          <SectionCard title="Returned items">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium" scope="col">Item</th>
                    <th className="px-3 py-2 font-medium" scope="col">Returned</th>
                    {hasInspection ? (
                      <>
                        <th className="px-3 py-2 font-medium" scope="col">Good</th>
                        <th className="px-3 py-2 font-medium" scope="col">Damaged</th>
                        <th className="px-3 py-2 font-medium" scope="col">Lost</th>
                      </>
                    ) : null}
                    <th className="px-3 py-2 font-medium" scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {returnRecord.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {rentalOrderItemLabelById.get(item.rentalOrderItemId) ??
                          item.rentalOrderItemId}
                      </td>
                      <td className="px-3 py-2">{item.returnedQuantity}</td>
                      {hasInspection ? (
                        <>
                          <td className="px-3 py-2">{item.goodQuantity}</td>
                          <td className="px-3 py-2">{item.damagedQuantity}</td>
                          <td className="px-3 py-2">{item.lostQuantity}</td>
                        </>
                      ) : null}
                      <td className="px-3 py-2">{item.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {hasInspection ? (
            <SectionCard title="Damage assessment">
              <dl className="grid gap-4 sm:grid-cols-3">
                <DetailField
                  label="Total damaged"
                  value={totalDamaged}
                />
                <DetailField label="Total lost" value={totalLost} />
                <DetailField
                  label="Total good"
                  value={returnRecord.items.reduce((sum, item) => sum + item.goodQuantity, 0)}
                />
              </dl>
            </SectionCard>
          ) : null}

          <EmptyCard
            title="Repair workflow"
            description="Repair requests will appear here when the repair module is connected."
          />

          <EmptyCard
            title="Maintenance workflow"
            description="Maintenance records will appear here when the maintenance module is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status timeline"
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

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(returnRecord.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(returnRecord.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Invoice adjustments"
            description="Rental invoice adjustments will appear here when billing integration is connected."
          />

          <EmptyCard
            title="Payment adjustments"
            description="Payment adjustments will appear here when payments integration is connected."
          />

          <EmptyCard
            title="Audit timeline"
            description="Audit trail details will appear here when available from the API."
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
