"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  DatePickerField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { useDispatch } from "@/features/dispatch/hooks";
import { useRentalOrder } from "@/features/rental-order/hooks";
import {
  createReturnFormSchema,
  updateReturnFormSchema,
  type CreateReturnFormValues,
  type UpdateReturnFormValues,
} from "../schemas";
import { computePriorReturnedByItem } from "../mappers";
import { useReturnFilterOptions, useReturnsByDispatch } from "../hooks";
import { ReturnLineItemsField } from "./return-line-items-field";

type ReturnFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateReturnFormProps = ReturnFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateReturnFormValues>;
  onSubmit: (values: CreateReturnFormValues) => void | Promise<void>;
};

type EditReturnFormProps = ReturnFormBaseProps & {
  mode: "edit";
  returnNumber: string;
  rentalOrderId: string;
  dispatchId: string;
  returnId: string;
  defaultValues: UpdateReturnFormValues;
  onSubmit: (values: UpdateReturnFormValues) => void | Promise<void>;
};

export type ReturnFormProps = CreateReturnFormProps | EditReturnFormProps;

const createDefaults: CreateReturnFormValues = {
  returnNumber: "",
  rentalOrderId: "",
  dispatchId: "",
  returnDate: new Date().toISOString(),
  remarks: "",
  items: [{ rentalOrderItemId: "", dispatchItemId: "", quantity: 1, notes: "" }],
};

export function ReturnForm(props: ReturnFormProps) {
  if (props.mode === "create") {
    return <CreateReturnForm {...props} />;
  }

  return <EditReturnForm {...props} />;
}

function CreateReturnForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateReturnFormProps) {
  const { rentalOrderOptions, completedDispatchOptions, dispatchRentalOrderById } =
    useReturnFilterOptions();
  const form = useForm<CreateReturnFormValues>({
    resolver: zodResolver(createReturnFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const rentalOrderId = form.watch("rentalOrderId");
  const dispatchId = form.watch("dispatchId");
  const { data: dispatch } = useDispatch(dispatchId);
  const { data: rentalOrder } = useRentalOrder(rentalOrderId);
  const { data: priorReturns } = useReturnsByDispatch(dispatchId);

  const dispatchOptionsForOrder = useMemo(
    () =>
      completedDispatchOptions.filter(
        (option) => dispatchRentalOrderById.get(option.id) === rentalOrderId,
      ),
    [completedDispatchOptions, dispatchRentalOrderById, rentalOrderId],
  );

  const { rentalOrderItemLabelById } = useReturnFilterOptions();
  const itemLabelById = useMemo(() => {
    const labels = new Map(rentalOrderItemLabelById);

    for (const item of rentalOrder?.items ?? []) {
      if (!labels.has(item.id)) {
        labels.set(item.id, item.productId);
      }
    }

    return labels;
  }, [rentalOrder?.items, rentalOrderItemLabelById]);

  useEffect(() => {
    if (!rentalOrderId) {
      return;
    }

    const currentDispatchId = form.getValues("dispatchId");
    const stillValid = dispatchOptionsForOrder.some((option) => option.id === currentDispatchId);

    if (!stillValid) {
      form.setValue("dispatchId", "");
    }
  }, [rentalOrderId, dispatchOptionsForOrder, form]);

  useEffect(() => {
    if (!dispatch || !priorReturns) {
      return;
    }

    const priorReturned = computePriorReturnedByItem(priorReturns.items);

    const items = dispatch.items
      .filter((item) => item.rentalOrderItemId)
      .map((item) => {
        const rentalOrderItemId = item.rentalOrderItemId!;
        const prior = priorReturned.get(rentalOrderItemId) ?? 0;
        const remaining = item.quantity - prior;

        return {
          rentalOrderItemId,
          dispatchItemId: item.id,
          quantity: remaining > 0 ? remaining : 1,
          maxQuantity: remaining > 0 ? remaining : 0,
          notes: "",
        };
      })
      .filter((item) => (item.maxQuantity ?? 0) > 0);

    if (items.length > 0) {
      form.setValue("items", items);
    }
  }, [dispatch, priorReturns, rentalOrder?.items, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Return details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="returnNumber"
            label="Return number"
            placeholder="e.g. RTN-2026-001"
            description="Unique identifier for this return."
          />
          <SelectField
            control={form.control}
            name="rentalOrderId"
            label="Rental order"
            placeholder="Select rental order"
            options={rentalOrderOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
          <SelectField
            control={form.control}
            name="dispatchId"
            label="Dispatch"
            placeholder={rentalOrderId ? "Select dispatch" : "Select rental order first"}
            disabled={!rentalOrderId}
            options={dispatchOptionsForOrder.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
          <DatePickerField control={form.control} name="returnDate" label="Return date" />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Returned items">
        <ReturnLineItemsField itemLabelById={itemLabelById} />
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Create return
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditReturnForm({
  returnNumber,
  rentalOrderId,
  dispatchId,
  returnId,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditReturnFormProps) {
  const { data: rentalOrder } = useRentalOrder(rentalOrderId);
  const { data: dispatch } = useDispatch(dispatchId);
  const { data: priorReturns } = useReturnsByDispatch(dispatchId);
  const form = useForm<UpdateReturnFormValues>({
    resolver: zodResolver(updateReturnFormSchema),
    defaultValues,
  });

  const { rentalOrderItemLabelById } = useReturnFilterOptions();
  const itemLabelById = useMemo(() => {
    const labels = new Map(rentalOrderItemLabelById);

    for (const item of rentalOrder?.items ?? []) {
      if (!labels.has(item.id)) {
        labels.set(item.id, item.productId);
      }
    }

    return labels;
  }, [rentalOrder?.items, rentalOrderItemLabelById]);

  useEffect(() => {
    if (!dispatch || !priorReturns) {
      return;
    }

    const priorReturned = computePriorReturnedByItem(priorReturns.items, returnId);
    const maxByRentalItem = new Map<string, number>();

    for (const dispatchItem of dispatch.items) {
      if (!dispatchItem.rentalOrderItemId) {
        continue;
      }

      const prior = priorReturned.get(dispatchItem.rentalOrderItemId) ?? 0;
      maxByRentalItem.set(dispatchItem.rentalOrderItemId, dispatchItem.quantity - prior);
    }

    const currentItems = form.getValues("items");
    form.setValue(
      "items",
      currentItems.map((item) => ({
        ...item,
        maxQuantity: maxByRentalItem.get(item.rentalOrderItemId),
      })),
    );
  }, [dispatch, priorReturns, returnId, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Return details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Return number
            </p>
            <p className="text-sm font-medium">{returnNumber}</p>
          </div>
          <DatePickerField control={form.control} name="returnDate" label="Return date" />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Returned items">
        <ReturnLineItemsField itemLabelById={itemLabelById} />
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
