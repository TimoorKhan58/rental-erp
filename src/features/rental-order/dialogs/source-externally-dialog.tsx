"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppModal } from "@/components/design-system/modal";
import { AppButton } from "@/components/design-system/button";
import { SelectField } from "@/components/design-system/form";
import { AppForm } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useExternalRentalFilterOptions } from "@/features/external-rental/hooks";
import { useForm } from "react-hook-form";
import type { RentalOrderItemShortfallResponse } from "../types";
import { useSourceRentalOrderExternally } from "../hooks";

type SourceExternallyDialogProps = {
  orderId: string;
  orderNumber: string;
  item: RentalOrderItemShortfallResponse | null;
  productLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormValues = {
  supplierId: string;
  quantity: number;
  unitCost: number;
};

export function SourceExternallyDialog({
  orderId,
  orderNumber,
  item,
  productLabel,
  open,
  onOpenChange,
}: SourceExternallyDialogProps) {
  const mutation = useSourceRentalOrderExternally(orderId);
  const { supplierOptions } = useExternalRentalFilterOptions();
  const [createdAgreementId, setCreatedAgreementId] = useState<string | null>(
    null,
  );

  const maxQuantity = item?.remainingShortfallQuantity ?? 0;

  const form = useForm<FormValues>({
    defaultValues: {
      supplierId: "",
      quantity: maxQuantity > 0 ? maxQuantity : 1,
      unitCost: 0,
    },
  });

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setCreatedAgreementId(null);
    form.reset({
      supplierId: "",
      quantity: item.remainingShortfallQuantity,
      unitCost: 0,
    });
  }, [open, item, form]);

  const quantity = form.watch("quantity");
  const remainingAfterSelection = useMemo(() => {
    if (!item) {
      return 0;
    }

    const selected = Number.isFinite(quantity) ? Number(quantity) : 0;
    return Math.max(0, item.remainingShortfallQuantity - selected);
  }, [item, quantity]);

  if (!item) {
    return null;
  }

  const handleSubmit = async (values: FormValues) => {
    if (!values.supplierId) {
      form.setError("supplierId", { message: "Supplier is required" });
      return;
    }

    const quantityValue = Number(values.quantity);
    if (
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0 ||
      quantityValue > maxQuantity
    ) {
      form.setError("quantity", {
        message: `Quantity must be between 1 and ${maxQuantity}`,
      });
      return;
    }

    const created = await mutation.mutateAsync({
      rentalOrderItemId: item.rentalOrderItemId,
      supplierId: values.supplierId,
      quantity: quantityValue,
      unitCost: Number(values.unitCost),
    });
    setCreatedAgreementId(created.id);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Source externally"
      description={`Cover owned shortfall for "${orderNumber}" via supplier hire-in.`}
      size="lg"
    >
      {createdAgreementId ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            External rental agreement created. Owned inventory was not changed.
          </p>
          <div className="flex justify-end gap-2">
            <AppButton variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </AppButton>
            <AppButton
              render={<Link href={ROUTES.externalRentalDetail(createdAgreementId)} />}
            >
              Open agreement
            </AppButton>
          </div>
        </div>
      ) : (
        <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
          <dl className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Product
              </dt>
              <dd className="font-medium">{productLabel}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Hire period
              </dt>
              <dd className="font-medium">
                {formatDate(item.hireStartDate)} – {formatDate(item.hireEndDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Required
              </dt>
              <dd className="tabular-nums">{item.requiredQuantity}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Owned available
              </dt>
              <dd className="tabular-nums">{item.ownedFulfillableQuantity}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Shortfall
              </dt>
              <dd className="tabular-nums font-medium">{item.shortfallQuantity}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Remaining shortfall
              </dt>
              <dd className="tabular-nums font-medium">
                {item.remainingShortfallQuantity}
              </dd>
            </div>
          </dl>

          <SelectField
            control={form.control}
            name="supplierId"
            label="Supplier"
            placeholder="Select supplier"
            options={supplierOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="source-qty">
                External quantity
              </label>
              <Input
                id="source-qty"
                type="number"
                min={1}
                max={maxQuantity}
                {...form.register("quantity", {
                  valueAsNumber: true,
                  required: true,
                  min: 1,
                  max: maxQuantity,
                })}
              />
              <p className="text-xs text-muted-foreground">
                Selected: {Number.isFinite(quantity) ? quantity : 0} · Remaining
                after selection: {remainingAfterSelection}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="source-unit-cost">
                Unit hire-in cost
              </label>
              <Input
                id="source-unit-cost"
                type="number"
                min={0}
                step="0.01"
                {...form.register("unitCost", {
                  valueAsNumber: true,
                  required: true,
                  min: 0,
                })}
              />
              <p className="text-xs text-muted-foreground">
                Preview line cost:{" "}
                {formatCurrency(
                  (Number.isFinite(quantity) ? Number(quantity) : 0) *
                    (Number(form.watch("unitCost")) || 0),
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <AppButton variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit" loading={mutation.isPending}>
              Create agreement
            </AppButton>
          </div>
        </AppForm>
      )}
    </AppModal>
  );
}
