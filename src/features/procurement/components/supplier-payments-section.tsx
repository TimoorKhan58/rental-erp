"use client";

import { useState } from "react";
import { AppButton } from "@/components/design-system/button";
import { AppModal } from "@/components/design-system/modal";
import { ConfirmModal } from "@/components/design-system/modal";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { PaymentRecordStatusBadge } from "@/features/payment/components";
import { METHOD_LABELS } from "@/features/payment/mappers";
import { PAYMENT_METHODS } from "@/features/payment/types";
import { canPostPayment, canVoidPayment } from "@/features/payment/mappers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateOrderTotal } from "../mappers";
import type { ProcurementResponse } from "../types";
import type { SupplierPaymentResponse } from "../types/supplier-payment.types";
import {
  isPurchaseOrderPayable,
  useCreatePurchaseOrderSupplierPayment,
  usePostSupplierPayment,
  usePurchaseOrderSupplierPayments,
  useSupplierPaymentPermissions,
  useVoidSupplierPayment,
} from "../hooks/use-supplier-payment";

type SupplierPaymentsSectionProps = {
  procurement: ProcurementResponse;
};

export function SupplierPaymentsSection({
  procurement,
}: SupplierPaymentsSectionProps) {
  const { canRead, canCreate, canPost, canVoid } =
    useSupplierPaymentPermissions();
  const { data, isLoading } = usePurchaseOrderSupplierPayments(procurement.id, {
    pageSize: 50,
  });
  const createMutation = useCreatePurchaseOrderSupplierPayment(procurement.id);
  const postMutation = usePostSupplierPayment(procurement.id);
  const voidMutation = useVoidSupplierPayment(procurement.id);

  const [recordOpen, setRecordOpen] = useState(false);
  const [postTarget, setPostTarget] = useState<SupplierPaymentResponse | null>(
    null,
  );
  const [voidTarget, setVoidTarget] = useState<SupplierPaymentResponse | null>(
    null,
  );

  const orderTotal =
    procurement.orderTotal ?? calculateOrderTotal(procurement.items);
  const paidAmount = procurement.paidAmount ?? 0;
  const balance = procurement.balance ?? orderTotal - paidAmount;
  const payable = isPurchaseOrderPayable(procurement.status);
  const payments = data?.items ?? [];

  if (!canRead) {
    return null;
  }

  return (
    <SectionCard
      title="Supplier payments"
      actions={
        payable && canCreate && balance > 0 ? (
          <AppButton size="sm" onClick={() => setRecordOpen(true)}>
            Record payment
          </AppButton>
        ) : null
      }
    >
      <dl className="mb-4 grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Order total
          </dt>
          <dd className="text-sm font-medium">{formatCurrency(orderTotal)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Paid
          </dt>
          <dd className="text-sm font-medium">{formatCurrency(paidAmount)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Balance
          </dt>
          <dd className="text-sm font-medium">{formatCurrency(balance)}</dd>
        </div>
      </dl>

      {isLoading ? (
        <LoadingState label="Loading payments..." />
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No supplier payments recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium" scope="col">
                  Number
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Date
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Method
                </th>
                <th className="px-3 py-2 font-medium text-right" scope="col">
                  Amount
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Status
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{payment.paymentNumber}</td>
                  <td className="px-3 py-2">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-3 py-2">
                    {METHOD_LABELS[payment.paymentMethod]}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-3 py-2">
                    <PaymentRecordStatusBadge status={payment.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {canPost && canPostPayment(payment.status) ? (
                        <AppButton
                          size="sm"
                          variant="outline"
                          onClick={() => setPostTarget(payment)}
                        >
                          Post
                        </AppButton>
                      ) : null}
                      {canVoid && canVoidPayment(payment.status) ? (
                        <AppButton
                          size="sm"
                          variant="outline"
                          onClick={() => setVoidTarget(payment)}
                        >
                          Void
                        </AppButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecordSupplierPaymentDialog
        key={recordOpen ? `open-${balance}` : "closed"}
        open={recordOpen}
        onOpenChange={setRecordOpen}
        supplierId={procurement.supplierId}
        balance={balance}
        isSubmitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
          setRecordOpen(false);
        }}
      />

      <ConfirmModal
        open={postTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPostTarget(null);
        }}
        title="Post supplier payment"
        description={
          postTarget
            ? `Post "${postTarget.paymentNumber}" for ${formatCurrency(postTarget.amount)}? This will apply the amount to the purchase order.`
            : undefined
        }
        confirmLabel="Post payment"
        isLoading={postMutation.isPending}
        onConfirm={() => {
          if (!postTarget) return;
          void postMutation.mutateAsync(postTarget.id).then(() => {
            setPostTarget(null);
          });
        }}
      />

      <ConfirmModal
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
        title="Void supplier payment"
        description={
          voidTarget
            ? voidTarget.status === "POSTED"
              ? `Void posted payment "${voidTarget.paymentNumber}"? This will reverse the amount from the purchase order.`
              : `Void payment "${voidTarget.paymentNumber}"?`
            : undefined
        }
        confirmLabel="Void payment"
        destructive
        isLoading={voidMutation.isPending}
        onConfirm={() => {
          if (!voidTarget) return;
          void voidMutation.mutateAsync(voidTarget.id).then(() => {
            setVoidTarget(null);
          });
        }}
      />
    </SectionCard>
  );
}

type RecordSupplierPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  balance: number;
  isSubmitting: boolean;
  onSubmit: (values: {
    supplierId: string;
    paymentDate: string;
    paymentMethod: (typeof PAYMENT_METHODS)[number];
    amount: number;
    referenceNumber?: string | null;
    notes?: string | null;
  }) => Promise<void>;
};

function RecordSupplierPaymentDialog({
  open,
  onOpenChange,
  supplierId,
  balance,
  isSubmitting,
  onSubmit,
}: RecordSupplierPaymentDialogProps) {
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("BANK_TRANSFER");
  const [amount, setAmount] = useState(String(balance));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    void onSubmit({
      supplierId,
      paymentDate: new Date(paymentDate).toISOString(),
      paymentMethod,
      amount: parsedAmount,
      referenceNumber: referenceNumber.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Record supplier payment"
      description="Create a pending payment against this purchase order."
      size="md"
      footer={
        <>
          <AppButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </AppButton>
          <AppButton onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Record payment"}
          </AppButton>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Payment date</span>
          <input
            type="date"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Method</span>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(
                event.target.value as (typeof PAYMENT_METHODS)[number],
              )
            }
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Amount</span>
          <input
            type="number"
            min={0.01}
            step="0.01"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <span className="text-xs text-muted-foreground">
            Remaining balance: {formatCurrency(balance)}
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Reference</span>
          <input
            type="text"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Notes</span>
          <textarea
            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
    </AppModal>
  );
}
