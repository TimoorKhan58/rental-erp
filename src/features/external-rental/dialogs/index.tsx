"use client";

import { useState } from "react";
import { AppModal, ConfirmModal } from "@/components/design-system/modal";
import { AppButton } from "@/components/design-system/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { ExternalRentalResponse } from "../types";
import { PAYMENT_METHODS, type PaymentMethod } from "@/features/payment/types";
import { METHOD_LABELS } from "@/features/payment/mappers";
import {
  useAllocateExternalRental,
  useCancelExternalRental,
  useConfirmExternalRental,
  useExternalRentalFilterOptions,
  useReceiveExternalRental,
  useSettleExternalRental,
  useSupplierReturnExternalRental,
  useWriteOffExternalRental,
} from "../hooks";

type QtyDialogProps = {
  agreement: ExternalRentalResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function QtyLinesEditor({
  lines,
  onChange,
}: {
  lines: Array<{
    rentalOrderItemId: string;
    label: string;
    remaining: number;
    quantity: number;
  }>;
  onChange: (next: typeof lines) => void;
}) {
  return (
    <div className="space-y-3">
      {lines.map((line, index) => (
        <div
          key={line.rentalOrderItemId}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm"
        >
          <div>
            <p className="font-medium">{line.label}</p>
            <p className="text-muted-foreground">Remaining: {line.remaining}</p>
          </div>
          <Input
            type="number"
            min={0}
            max={line.remaining}
            value={line.quantity}
            onChange={(event) => {
              const quantity = Number(event.target.value);
              const next = [...lines];
              next[index] = { ...line, quantity };
              onChange(next);
            }}
            className="w-24"
          />
        </div>
      ))}
    </div>
  );
}

export function ConfirmExternalRentalDialog({
  agreement,
  open,
  onOpenChange,
}: QtyDialogProps) {
  const mutation = useConfirmExternalRental();
  const { productLabelById } = useExternalRentalFilterOptions();
  const [lines, setLines] = useState(() =>
    agreement.items.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      label: productLabelById.get(item.productId) ?? item.productId,
      remaining: item.quantityRequested,
      quantity: item.quantityRequested,
    })),
  );

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm agreement"
      description={`Confirm quantities for ${agreement.agreementNumber}.`}
    >
      <div className="space-y-4">
        <QtyLinesEditor lines={lines} onChange={setLines} />
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            loading={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync({
                id: agreement.id,
                payload: {
                  items: lines
                    .filter((line) => line.quantity > 0)
                    .map((line) => ({
                      rentalOrderItemId: line.rentalOrderItemId,
                      quantityConfirmed: line.quantity,
                    })),
                },
              });
              onOpenChange(false);
            }}
          >
            Confirm
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}

export function ReceiveExternalRentalDialog({
  agreement,
  open,
  onOpenChange,
}: QtyDialogProps) {
  const mutation = useReceiveExternalRental();
  const { productLabelById } = useExternalRentalFilterOptions();
  const [lines, setLines] = useState(() =>
    agreement.items
      .map((item) => {
        const remaining = Math.max(
          0,
          item.quantityConfirmed - item.quantityReceived,
        );
        return {
          rentalOrderItemId: item.rentalOrderItemId,
          label: productLabelById.get(item.productId) ?? item.productId,
          remaining,
          quantity: remaining,
        };
      })
      .filter((line) => line.remaining > 0),
  );

  if (lines.length === 0) return null;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Receive from supplier"
      description={`Record received quantities for ${agreement.agreementNumber}.`}
    >
      <div className="space-y-4">
        <QtyLinesEditor lines={lines} onChange={setLines} />
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            loading={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync({
                id: agreement.id,
                payload: {
                  items: lines
                    .filter((line) => line.quantity > 0)
                    .map((line) => ({
                      rentalOrderItemId: line.rentalOrderItemId,
                      quantity: line.quantity,
                    })),
                },
              });
              onOpenChange(false);
            }}
          >
            Receive
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}

export function AllocateExternalRentalDialog({
  agreement,
  open,
  onOpenChange,
}: QtyDialogProps) {
  const mutation = useAllocateExternalRental();
  const { productLabelById } = useExternalRentalFilterOptions();
  const [lines, setLines] = useState(() =>
    agreement.items
      .map((item) => {
        const remaining = Math.max(
          0,
          item.quantityReceived - item.quantityAllocated,
        );
        return {
          rentalOrderItemId: item.rentalOrderItemId,
          label: productLabelById.get(item.productId) ?? item.productId,
          remaining,
          quantity: remaining,
        };
      })
      .filter((line) => line.remaining > 0),
  );

  if (lines.length === 0) return null;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Allocate to rental order"
      description={`Allocate received qty for ${agreement.agreementNumber}.`}
    >
      <div className="space-y-4">
        <QtyLinesEditor lines={lines} onChange={setLines} />
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            loading={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync({
                id: agreement.id,
                payload: {
                  items: lines
                    .filter((line) => line.quantity > 0)
                    .map((line) => ({
                      rentalOrderItemId: line.rentalOrderItemId,
                      quantity: line.quantity,
                    })),
                },
              });
              onOpenChange(false);
            }}
          >
            Allocate
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}

export function SupplierReturnExternalRentalDialog({
  agreement,
  open,
  onOpenChange,
}: QtyDialogProps) {
  const mutation = useSupplierReturnExternalRental();
  const { productLabelById } = useExternalRentalFilterOptions();
  const [lines, setLines] = useState(() =>
    agreement.items
      .map((item) => ({
        rentalOrderItemId: item.rentalOrderItemId,
        label: productLabelById.get(item.productId) ?? item.productId,
        remaining: Math.max(0, item.qtyInCompanyCustody),
        quantity: Math.max(0, item.qtyInCompanyCustody),
      }))
      .filter((line) => line.remaining > 0),
  );

  if (lines.length === 0) return null;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Return to supplier"
      description={`Send hired items back to the supplier for ${agreement.agreementNumber}. The numbers below are what you have in hand.`}
    >
      <div className="space-y-4">
        <p className="rounded-md border border-warning/40 bg-warning-muted px-3 py-2 text-sm text-warning-foreground">
          Did the customer lose or break any hired item beyond repair? Close this and use
          “Write off” for those first, then send back only what you really have.
        </p>
        <QtyLinesEditor lines={lines} onChange={setLines} />
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            loading={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync({
                id: agreement.id,
                payload: {
                  items: lines
                    .filter((line) => line.quantity > 0)
                    .map((line) => ({
                      rentalOrderItemId: line.rentalOrderItemId,
                      quantity: line.quantity,
                    })),
                },
              });
              onOpenChange(false);
            }}
          >
            Return
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}

export function WriteOffExternalRentalDialog({
  agreement,
  open,
  onOpenChange,
}: QtyDialogProps) {
  const mutation = useWriteOffExternalRental();
  const { productLabelById } = useExternalRentalFilterOptions();
  const [lines, setLines] = useState(() =>
    agreement.items
      .map((item) => ({
        rentalOrderItemId: item.rentalOrderItemId,
        label: productLabelById.get(item.productId) ?? item.productId,
        remaining: Math.max(0, item.qtyInCompanyCustody),
        quantity: Math.max(0, item.qtyInCompanyCustody),
      }))
      .filter((line) => line.remaining > 0),
  );

  if (lines.length === 0) return null;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Write off external quantity"
      description={`Permanently write off company-custody qty for ${agreement.agreementNumber}. This cannot be undone.`}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Only quantity currently in company custody can be written off. Quantity
          still with the customer cannot be written off.
        </p>
        <QtyLinesEditor lines={lines} onChange={setLines} />
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            variant="destructive"
            loading={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync({
                id: agreement.id,
                payload: {
                  items: lines
                    .filter((line) => line.quantity > 0)
                    .map((line) => ({
                      rentalOrderItemId: line.rentalOrderItemId,
                      quantity: line.quantity,
                    })),
                },
              });
              onOpenChange(false);
            }}
          >
            Write off
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}

export function SettleExternalRentalDialog({
  agreement,
  open,
  onOpenChange,
}: QtyDialogProps) {
  const mutation = useSettleExternalRental();
  const [paymentAmount, setPaymentAmount] = useState(
    agreement.outstandingBalance,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Pay the supplier"
      description={`Still owed: ${formatCurrency(agreement.outstandingBalance)}`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="settle-payment-method">
            Paid by
          </label>
          <select
            id="settle-payment-method"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount paid</label>
          <Input
            type="number"
            min={0.01}
            max={agreement.outstandingBalance}
            step="0.01"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(Number(event.target.value))}
          />
        </div>
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            loading={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync({
                id: agreement.id,
                payload: { paymentAmount, paymentMethod },
              });
              onOpenChange(false);
            }}
          >
            Record payment
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}

export function CancelExternalRentalDialog({
  agreement,
  open,
  onOpenChange,
}: QtyDialogProps) {
  const mutation = useCancelExternalRental();

  const handleConfirm = async () => {
    await mutation.mutateAsync(agreement.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      cancelLabel="No, keep it"
      destructive
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel external rental"
      description={`Cancel "${agreement.agreementNumber}"? You can create a replacement agreement for the same rental order after cancellation.`}
      confirmLabel="Cancel agreement"
      onConfirm={() => void handleConfirm()}
      isLoading={mutation.isPending}
    />
  );
}
