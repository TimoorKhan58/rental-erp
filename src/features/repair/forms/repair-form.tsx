"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  DatePickerField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { useRentalOrder } from "@/features/rental-order/hooks";
import { useReturn } from "@/features/return/hooks";
import {
  createRepairFormSchema,
  updateRepairFormSchema,
  type CreateRepairFormValues,
  type UpdateRepairFormValues,
} from "../schemas";
import { computePriorRepairedByItem } from "../mappers";
import {
  useRepairFilterOptions,
  useRepairsByReturn,
} from "../hooks";

type RepairFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateRepairFormProps = RepairFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateRepairFormValues>;
  onSubmit: (values: CreateRepairFormValues) => void | Promise<void>;
};

type EditRepairFormProps = RepairFormBaseProps & {
  mode: "edit";
  repairNumber: string;
  returnId: string;
  returnItemId: string;
  productId: string;
  warehouseId: string;
  repairId: string;
  defaultValues: UpdateRepairFormValues;
  onSubmit: (values: UpdateRepairFormValues) => void | Promise<void>;
};

export type RepairFormProps = CreateRepairFormProps | EditRepairFormProps;

const createDefaults: CreateRepairFormValues = {
  repairNumber: "",
  returnId: "",
  returnItemId: "",
  productId: "",
  warehouseId: "",
  quantity: 1,
  repairCost: 0,
  repairDate: new Date().toISOString(),
  repairNotes: "",
  technician: "",
};

export function RepairForm(props: RepairFormProps) {
  if (props.mode === "create") {
    return <CreateRepairForm {...props} />;
  }

  return <EditRepairForm {...props} />;
}

function CreateRepairForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateRepairFormProps) {
  const { returnOptions, productLabelById, warehouseLabelById } = useRepairFilterOptions();
  const form = useForm<CreateRepairFormValues>({
    resolver: zodResolver(createRepairFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const returnId = form.watch("returnId");
  const returnItemId = form.watch("returnItemId");
  const { data: returnRecord } = useReturn(returnId);
  const { data: rentalOrder } = useRentalOrder(returnRecord?.rentalOrderId ?? "");
  const { data: priorRepairs } = useRepairsByReturn(returnId);

  const returnItemOptions = useMemo(() => {
    if (!returnRecord || !priorRepairs) {
      return [];
    }

    const priorRepaired = computePriorRepairedByItem(priorRepairs.items);
    const productByRentalItem = new Map(
      (rentalOrder?.items ?? []).map((item) => [item.id, item.productId]),
    );

    return returnRecord.items
      .filter((item) => item.damagedQuantity > 0)
      .map((item) => {
        const prior = priorRepaired.get(item.id) ?? 0;
        const remaining = item.damagedQuantity - prior;
        const productId =
          productByRentalItem.get(item.rentalOrderItemId) ?? "";

        return {
          id: item.id,
          label: productLabelById.get(productId) ?? item.id,
          remaining,
          productId,
          damagedQuantity: item.damagedQuantity,
        };
      })
      .filter((item) => item.remaining > 0);
  }, [returnRecord, priorRepairs, rentalOrder?.items, productLabelById]);

  useEffect(() => {
    if (!returnRecord) {
      return;
    }

    const currentItemId = form.getValues("returnItemId");
    const stillValid = returnItemOptions.some((option) => option.id === currentItemId);

    if (!stillValid) {
      form.setValue("returnItemId", "");
      form.setValue("productId", "");
      form.setValue("warehouseId", "");
    }
  }, [returnRecord, returnItemOptions, form]);

  useEffect(() => {
    if (!returnItemId || !returnRecord || !rentalOrder) {
      return;
    }

    const selected = returnItemOptions.find((option) => option.id === returnItemId);

    if (!selected) {
      return;
    }

    form.setValue("productId", selected.productId, { shouldValidate: true });
    form.setValue("warehouseId", rentalOrder.warehouseId, { shouldValidate: true });
    form.setValue("maxQuantity", selected.remaining);
    form.setValue("quantity", Math.min(form.getValues("quantity"), selected.remaining));
  }, [returnItemId, returnRecord, rentalOrder, returnItemOptions, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Repair details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="repairNumber"
            label="Repair number"
            placeholder="e.g. RPR-2026-001"
            description="Unique identifier for this repair."
          />
          <SelectField
            control={form.control}
            name="returnId"
            label="Return"
            placeholder="Select return"
            options={returnOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
          <SelectField
            control={form.control}
            name="returnItemId"
            label="Return item"
            placeholder={returnId ? "Select damaged item" : "Select return first"}
            disabled={!returnId}
            options={returnItemOptions.map((option) => ({
              value: option.id,
              label: `${option.label} (${option.remaining} available)`,
            }))}
          />
          <DatePickerField control={form.control} name="repairDate" label="Repair date" />
          <NumberField
            control={form.control}
            name="quantity"
            label="Quantity"
            min={1}
            max={form.watch("maxQuantity")}
            description={
              form.watch("maxQuantity") !== undefined
                ? `Max: ${form.watch("maxQuantity")}`
                : undefined
            }
          />
          <NumberField
            control={form.control}
            name="repairCost"
            label="Repair cost"
            min={0}
            step={0.01}
          />
          <TextField control={form.control} name="technician" label="Technician" />
          <TextAreaField
            control={form.control}
            name="repairNotes"
            label="Repair notes"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Asset context">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Product
            </dt>
            <dd className="text-sm">
              {productLabelById.get(form.watch("productId")) ??
                (form.watch("productId") || "—")}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Warehouse
            </dt>
            <dd className="text-sm">
              {warehouseLabelById.get(form.watch("warehouseId")) ??
                (form.watch("warehouseId") || "—")}
            </dd>
          </div>
        </dl>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Create repair
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditRepairForm({
  repairNumber,
  returnId,
  returnItemId,
  productId,
  warehouseId,
  repairId,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditRepairFormProps) {
  const { productLabelById, warehouseLabelById } = useRepairFilterOptions();
  const { data: returnRecord } = useReturn(returnId);
  const { data: priorRepairs } = useRepairsByReturn(returnId);
  const form = useForm<UpdateRepairFormValues>({
    resolver: zodResolver(updateRepairFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!returnRecord || !priorRepairs) {
      return;
    }

    const returnItem = returnRecord.items.find((item) => item.id === returnItemId);

    if (!returnItem) {
      return;
    }

    const priorRepaired = computePriorRepairedByItem(priorRepairs.items, repairId);
    const prior = priorRepaired.get(returnItemId) ?? 0;
    const remaining = returnItem.damagedQuantity - prior;

    form.setValue("maxQuantity", remaining);
  }, [returnRecord, priorRepairs, returnItemId, repairId, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Repair details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Repair number
            </p>
            <p className="text-sm font-medium">{repairNumber}</p>
          </div>
          <DatePickerField control={form.control} name="repairDate" label="Repair date" />
          <NumberField
            control={form.control}
            name="quantity"
            label="Quantity"
            min={1}
            max={form.watch("maxQuantity")}
            description={
              form.watch("maxQuantity") !== undefined
                ? `Max: ${form.watch("maxQuantity")}`
                : undefined
            }
          />
          <NumberField
            control={form.control}
            name="repairCost"
            label="Repair cost"
            min={0}
            step={0.01}
          />
          <TextField control={form.control} name="technician" label="Technician" />
          <TextAreaField
            control={form.control}
            name="repairNotes"
            label="Repair notes"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Asset context">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Product
            </dt>
            <dd className="text-sm">{productLabelById.get(productId) ?? productId}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Warehouse
            </dt>
            <dd className="text-sm">{warehouseLabelById.get(warehouseId) ?? warehouseId}</dd>
          </div>
        </dl>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Save changes
        </AppButton>
      </div>
    </AppForm>
  );
}
