"use client";

import { useState } from "react";
import { AppModal } from "@/components/design-system/modal";
import { AppButton } from "@/components/design-system/button";
import { Input } from "@/components/ui/input";
import type { ExternalRentalResponse } from "../types";
import {
  useAllocateExternalRental,
  useConfirmExternalRental,
  useReceiveExternalRental,
  useSettleExternalRental,
  useSupplierReturnExternalRental,
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
  lines: Array<{ rentalOrderItemId: string; label: string; remaining: number; quantity: number }>;
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
  const [lines, setLines] = useState(() =>
    agreement.items.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      label: item.productId,
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
  const [lines, setLines] = useState(() =>
    agreement.items
      .map((item) => {
        const remaining = Math.max(
          0,
          item.quantityConfirmed - item.quantityReceived,
        );
        return {
          rentalOrderItemId: item.rentalOrderItemId,
          label: item.productId,
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
  const [lines, setLines] = useState(() =>
    agreement.items
      .map((item) => {
        const remaining = Math.max(
          0,
          item.quantityReceived - item.quantityAllocated,
        );
        return {
          rentalOrderItemId: item.rentalOrderItemId,
          label: item.productId,
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
  const [lines, setLines] = useState(() =>
    agreement.items
      .map((item) => ({
        rentalOrderItemId: item.rentalOrderItemId,
        label: item.productId,
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
      description={`Return company-custody qty for ${agreement.agreementNumber}.`}
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
            Return
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
  const [paymentAmount, setPaymentAmount] = useState(agreement.outstandingBalance);

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Record settlement"
      description={`Outstanding balance: ${agreement.outstandingBalance}`}
    >
      <div className="space-y-4">
        <Input
          type="number"
          min={0.01}
          max={agreement.outstandingBalance}
          step="0.01"
          value={paymentAmount}
          onChange={(event) => setPaymentAmount(Number(event.target.value))}
        />
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            loading={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync({
                id: agreement.id,
                payload: { paymentAmount },
              });
              onOpenChange(false);
            }}
          >
            Settle
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}
