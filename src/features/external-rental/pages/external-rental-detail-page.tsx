"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useExternalRental,
  useExternalRentalFilterOptions,
  useExternalRentalPermissions,
} from "../hooks";
import {
  ExternalRentalSettlementBadge,
  ExternalRentalStatusBadge,
  canAllocateExternalRental,
  canCancelExternalRental,
  canConfirmExternalRental,
  canReceiveExternalRental,
  canSettleExternalRental,
  canSupplierReturnExternalRental,
  canWriteOffExternalRental,
  getNextExternalRentalStep,
} from "../components/external-rental-status-badge";
import {
  AllocateExternalRentalDialog,
  CancelExternalRentalDialog,
  ConfirmExternalRentalDialog,
  ReceiveExternalRentalDialog,
  SettleExternalRentalDialog,
  SupplierReturnExternalRentalDialog,
  WriteOffExternalRentalDialog,
} from "../dialogs";

type ExternalRentalDetailPageProps = {
  externalRentalId: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
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

export function ExternalRentalDetailPage({
  externalRentalId,
}: ExternalRentalDetailPageProps) {
  const { data: agreement, isLoading, isError, error, refetch } =
    useExternalRental(externalRentalId);
  const {
    canConfirm,
    canReceive,
    canAllocate,
    canReturnToSupplier,
    canWriteOff,
    canSettle,
    canCancel,
  } = useExternalRentalPermissions();
  const { productLabelById, supplierLabelById, warehouseLabelById, rentalOrderLabelById } =
    useExternalRentalFilterOptions();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const hasCompanyCustody = agreement
    ? agreement.items.some((item) => item.qtyInCompanyCustody > 0)
    : false;

  const nextStep = agreement
    ? getNextExternalRentalStep(agreement.status, {
        hasCompanyCustody,
        outstandingBalance: agreement.outstandingBalance,
      })
    : null;

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading external rental..." />
      </PageContainer>
    );
  }

  if (isError || !agreement) {
    return (
      <PageContainer>
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-medium">Agreement not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "Could not load this external rental."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton
              variant="outline"
              render={<Link href={ROUTES.externalRentals} />}
            >
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
        title={(supplierLabelById.get(agreement.supplierId) ?? agreement.supplierId).replace(/^.*? — /, "")}
        description={`Hire-in ${agreement.agreementNumber}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Hire-ins", href: ROUTES.externalRentals },
          { label: agreement.agreementNumber },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.externalRentals} />}
            >
              Back
            </AppButton>
            {canConfirm && canConfirmExternalRental(agreement.status) ? (
              <AppButton onClick={() => setConfirmOpen(true)}>Confirm</AppButton>
            ) : null}
            {canReceive && canReceiveExternalRental(agreement.status) ? (
              <AppButton variant="outline" onClick={() => setReceiveOpen(true)}>
                Receive
              </AppButton>
            ) : null}
            {canAllocate && canAllocateExternalRental(agreement.status) ? (
              <AppButton variant="outline" onClick={() => setAllocateOpen(true)}>
                Allocate
              </AppButton>
            ) : null}
            {canReturnToSupplier &&
            canSupplierReturnExternalRental(agreement.status) ? (
              <AppButton variant="outline" onClick={() => setReturnOpen(true)}>
                Supplier return
              </AppButton>
            ) : null}
            {canWriteOff &&
            canWriteOffExternalRental(agreement.status) &&
            hasCompanyCustody ? (
              <AppButton
                variant="outline"
                onClick={() => setWriteOffOpen(true)}
              >
                Write off
              </AppButton>
            ) : null}
            {canSettle &&
            canSettleExternalRental(
              agreement.status,
              agreement.amountDue,
              agreement.amountPaid,
            ) ? (
              <AppButton variant="outline" onClick={() => setSettleOpen(true)}>
                Settle
              </AppButton>
            ) : null}
            {canCancel && canCancelExternalRental(agreement.status) ? (
              <AppButton
                variant="destructive"
                onClick={() => setCancelOpen(true)}
              >
                Cancel
              </AppButton>
            ) : null}
          </>
        }
      />

      {nextStep ? (
        <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <p className="text-sm font-medium">Next: {nextStep.label}</p>
          <p className="text-sm text-muted-foreground">{nextStep.hint}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Agreement" className="lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd>
                <ExternalRentalStatusBadge status={agreement.status} />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Payment
              </dt>
              <dd>
                <ExternalRentalSettlementBadge
                  status={agreement.settlementStatus}
                />
              </dd>
            </div>
            <DetailField
              label="Goes to"
              value={(
                warehouseLabelById.get(agreement.warehouseId) ??
                agreement.warehouseId
              ).replace(/^.*? — /, "")}
            />
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                For order
              </dt>
              <dd className="text-sm">
                <Link
                  href={ROUTES.rentalOrderDetail(agreement.rentalOrderId)}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {rentalOrderLabelById.get(agreement.rentalOrderId)?.replace(/ — .*$/, "") ??
                    "View order"}
                </Link>
              </dd>
            </div>
            <DetailField
              label="Hired from"
              value={formatDate(agreement.hireStartDate)}
            />
            <DetailField
              label="Hired until"
              value={formatDate(agreement.hireEndDate)}
            />
            <DetailField
              label="Send back to supplier by"
              value={formatDate(agreement.expectedReturnToSupplierDate)}
            />
            <DetailField label="Remarks" value={agreement.remarks} />
          </dl>
        </SectionCard>

        <SectionCard title="Money">
          <dl className="space-y-3">
            <DetailField
              label="Cost of items received"
              value={formatCurrency(agreement.amountDue)}
            />
            <DetailField
              label="Paid so far"
              value={formatCurrency(agreement.amountPaid)}
            />
            <DetailField
              label="Still owed"
              value={formatCurrency(agreement.outstandingBalance)}
            />
            <DetailField
              label="Full cost if everything arrives"
              value={formatCurrency(agreement.totalHireInCost)}
            />
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="Items" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium text-right">Hired</th>
                <th className="px-3 py-2 font-medium text-right">With customer</th>
                <th className="px-3 py-2 font-medium text-right">With you</th>
                <th className="px-3 py-2 font-medium text-right">Sent back</th>
                <th className="px-3 py-2 font-medium text-right">Lost</th>
                <th className="px-3 py-2 font-medium text-right">Cost each</th>
              </tr>
            </thead>
            <tbody>
              {agreement.items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    {(productLabelById.get(item.productId) ?? item.productId).replace(/^.*? — /, "")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {item.quantityConfirmed || item.quantityRequested}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.qtyWithCustomer}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.qtyInCompanyCustody}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.quantityReturnedToSupplier}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.quantityWrittenOff}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Hired = how many you asked the supplier for. With customer and With you are where the items are
            right now. Sent back and Lost are what you no longer owe the supplier items for.
          </p>
        </div>
      </SectionCard>

      {confirmOpen ? (
        <ConfirmExternalRentalDialog
          agreement={agreement}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
        />
      ) : null}
      {receiveOpen ? (
        <ReceiveExternalRentalDialog
          agreement={agreement}
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
        />
      ) : null}
      {allocateOpen ? (
        <AllocateExternalRentalDialog
          agreement={agreement}
          open={allocateOpen}
          onOpenChange={setAllocateOpen}
        />
      ) : null}
      {returnOpen ? (
        <SupplierReturnExternalRentalDialog
          agreement={agreement}
          open={returnOpen}
          onOpenChange={setReturnOpen}
        />
      ) : null}
      {writeOffOpen ? (
        <WriteOffExternalRentalDialog
          agreement={agreement}
          open={writeOffOpen}
          onOpenChange={setWriteOffOpen}
        />
      ) : null}
      {settleOpen ? (
        <SettleExternalRentalDialog
          agreement={agreement}
          open={settleOpen}
          onOpenChange={setSettleOpen}
        />
      ) : null}
      {cancelOpen ? (
        <CancelExternalRentalDialog
          agreement={agreement}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      ) : null}
    </PageContainer>
  );
}
