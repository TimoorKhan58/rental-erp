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
import { useSupplier } from "@/features/supplier/hooks";
import { useWarehouse } from "@/features/warehouse/hooks";
import {
  calculateLineSubtotal,
  calculateOrderTotal,
  canApproveProcurement,
  canCancelProcurement,
  canEditProcurement,
  canReceiveProcurement,
  getRemainingQuantity,
} from "../mappers";
import {
  useProcurement,
  useProcurementFilterOptions,
  useProcurementPermissions,
} from "../hooks";
import { ProcurementStatusBadge } from "../components/procurement-status-badge";
import { ProcurementStatusTimeline } from "../components/procurement-status-timeline";
import { ApproveProcurementDialog } from "../dialogs/approve-procurement-dialog";
import { CancelProcurementDialog } from "../dialogs/cancel-procurement-dialog";
import { ReceiveProcurementDialog } from "../dialogs/receive-procurement-dialog";

type ProcurementDetailPageProps = {
  procurementId: string;
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

export function ProcurementDetailPage({ procurementId }: ProcurementDetailPageProps) {
  const router = useRouter();
  const { data: procurement, isLoading, isError, error, refetch } = useProcurement(procurementId);
  const { canUpdate, canApprove, canReceive, canCancel } = useProcurementPermissions();
  const { productLabelById, supplierLabelById, warehouseLabelById } =
    useProcurementFilterOptions();
  const { data: supplier } = useSupplier(procurement?.supplierId ?? "");
  const { data: warehouse } = useWarehouse(procurement?.warehouseId ?? "");

  const [approveOpen, setApproveOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading purchase order details..." />
      </PageContainer>
    );
  }

  if (isError || !procurement) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Purchase order not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested purchase order could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.procurements} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const orderTotal = calculateOrderTotal(procurement.items);
  const totalReceived = procurement.items.reduce(
    (sum, item) => sum + item.receivedQuantity,
    0,
  );
  const totalOrdered = procurement.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <PageContainer>
      <PageHeader
        title={procurement.poNumber}
        description={`Supplier: ${supplierLabelById.get(procurement.supplierId) ?? procurement.supplierId}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Procurement", href: ROUTES.procurements },
          { label: procurement.poNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.procurements} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditProcurement(procurement.status) ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.procurementEdit(procurement.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canApprove && canApproveProcurement(procurement.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<CheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setApproveOpen(true)}
              >
                Approve
              </AppButton>
            ) : null}
            {canReceive && canReceiveProcurement(procurement.status) ? (
              <AppButton
                leftIcon={<PackageIcon className="size-4" aria-hidden="true" />}
                onClick={() => setReceiveOpen(true)}
              >
                Receive goods
              </AppButton>
            ) : null}
            {canCancel && canCancelProcurement(procurement.status, procurement.items) ? (
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
          label="Received"
          value={`${totalReceived} / ${totalOrdered}`}
          hint="Units received vs ordered"
        />
        <MetricCard
          label="Line items"
          value={procurement.items.length}
          hint="Products on this order"
        />
        <MetricCard
          label="Status"
          value={<ProcurementStatusBadge status={procurement.status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Purchase order header">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="PO number" value={procurement.poNumber} />
              <DetailField label="Order date" value={formatDate(procurement.orderDate)} />
              <DetailField
                label="Expected date"
                value={
                  procurement.expectedDate ? formatDate(procurement.expectedDate) : null
                }
              />
              <DetailField label="Remarks" value={procurement.remarks} />
            </dl>
          </SectionCard>

          <SectionCard title="Supplier">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Supplier" value={supplier?.name ?? supplierLabelById.get(procurement.supplierId)} />
              <DetailField label="Supplier code" value={supplier?.supplierCode} />
              <DetailField label="Phone" value={supplier?.phone} />
              <DetailField label="Email" value={supplier?.email} />
              {supplier ? (
                <div className="sm:col-span-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    render={<Link href={ROUTES.supplierDetail(supplier.id)} />}
                  >
                    View supplier
                  </AppButton>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Warehouse">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Warehouse" value={warehouse?.name ?? warehouseLabelById.get(procurement.warehouseId)} />
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
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium" scope="col">Product</th>
                    <th className="px-3 py-2 font-medium" scope="col">Ordered</th>
                    <th className="px-3 py-2 font-medium" scope="col">Received</th>
                    <th className="px-3 py-2 font-medium" scope="col">Remaining</th>
                    <th className="px-3 py-2 font-medium text-right" scope="col">Unit cost</th>
                    <th className="px-3 py-2 font-medium text-right" scope="col">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {procurement.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {productLabelById.get(item.productId) ?? item.productId}
                      </td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.receivedQuantity}</td>
                      <td className="px-3 py-2">{getRemainingQuantity(item)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(calculateLineSubtotal(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/20">
                    <td colSpan={5} className="px-3 py-2 text-right font-medium">
                      Order total
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatCurrency(orderTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <EmptyCard
            title="Inventory impact"
            description="Inventory posting details will appear here when stock movement integration is connected."
          />

          <EmptyCard
            title="Accounting entries"
            description="Journal entries will appear here when the accounting module is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status timeline"
            actions={<ProcurementStatusBadge status={procurement.status} />}
          >
            <ProcurementStatusTimeline status={procurement.status} />
          </SectionCard>

          <SectionCard title="Receiving status">
            <dl className="space-y-4">
              <DetailField
                label="Units received"
                value={`${totalReceived} of ${totalOrdered}`}
              />
              <DetailField label="Current status" value={procurement.status} />
            </dl>
          </SectionCard>

          <SectionCard title="Account">
            <dl className="space-y-4">
              <DetailField label="Created" value={formatDate(procurement.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(procurement.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Supplier payments"
            description="Payment history will appear here when the payments module is connected."
          />

          <EmptyCard
            title="Audit timeline"
            description="Audit trail details will appear here when available from the API."
          />
        </div>
      </div>

      <ApproveProcurementDialog
        procurement={procurement}
        open={approveOpen}
        onOpenChange={setApproveOpen}
      />

      <ReceiveProcurementDialog
        procurement={procurement}
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
      />

      <CancelProcurementDialog
        procurement={procurement}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => router.push(ROUTES.procurements)}
      />
    </PageContainer>
  );
}
