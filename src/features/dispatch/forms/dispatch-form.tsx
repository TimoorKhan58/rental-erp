"use client";

import { useEffect } from "react";
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
import { DELIVERY_METHODS } from "../types";
import {
  createDispatchFormSchema,
  updateDispatchFormSchema,
  type CreateDispatchFormValues,
  type UpdateDispatchFormValues,
} from "../schemas";
import { DELIVERY_METHOD_LABELS } from "../mappers";
import { useDispatchFilterOptions } from "../hooks";
import { useRentalOrder } from "@/features/rental-order/hooks";
import { DispatchLineItemsField } from "./dispatch-line-items-field";

type DispatchFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateDispatchFormProps = DispatchFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateDispatchFormValues>;
  onSubmit: (values: CreateDispatchFormValues) => void | Promise<void>;
};

type EditDispatchFormProps = DispatchFormBaseProps & {
  mode: "edit";
  dispatchNumber: string;
  rentalOrderId: string;
  defaultValues: UpdateDispatchFormValues;
  onSubmit: (values: UpdateDispatchFormValues) => void | Promise<void>;
};

export type DispatchFormProps = CreateDispatchFormProps | EditDispatchFormProps;

const deliveryOptions = DELIVERY_METHODS.map((method) => ({
  value: method,
  label: DELIVERY_METHOD_LABELS[method],
}));

const createDefaults: CreateDispatchFormValues = {
  dispatchNumber: "",
  rentalOrderId: "",
  dispatchDate: new Date().toISOString(),
  deliveryMethod: "DELIVERY",
  vehicleNumber: "",
  driverName: "",
  driverPhone: "",
  deliveryAddress: "",
  remarks: "",
  items: [{ productId: "", rentalOrderItemId: "", quantity: 1, notes: "" }],
};

export function DispatchForm(props: DispatchFormProps) {
  if (props.mode === "create") {
    return <CreateDispatchForm {...props} />;
  }

  return <EditDispatchForm {...props} />;
}

function CreateDispatchForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateDispatchFormProps) {
  const { rentalOrderOptions, productLabelById } = useDispatchFilterOptions();
  const form = useForm<CreateDispatchFormValues>({
    resolver: zodResolver(createDispatchFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const rentalOrderId = form.watch("rentalOrderId");
  const { data: rentalOrder } = useRentalOrder(rentalOrderId);

  useEffect(() => {
    if (!rentalOrder) {
      return;
    }

    const items = rentalOrder.items
      .filter((item) => item.reservedQuantity > 0)
      .map((item) => ({
        productId: item.productId,
        rentalOrderItemId: item.id,
        quantity: item.reservedQuantity,
        maxQuantity: item.reservedQuantity,
        notes: "",
      }));

    if (items.length > 0) {
      form.setValue("items", items);
    }
  }, [rentalOrder, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Dispatch details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="dispatchNumber"
            label="Dispatch number"
            placeholder="e.g. DSP-2026-001"
            description="Unique identifier for this dispatch."
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
          <DatePickerField control={form.control} name="dispatchDate" label="Dispatch date" />
          <SelectField
            control={form.control}
            name="deliveryMethod"
            label="Delivery method"
            options={deliveryOptions}
          />
          <TextField
            control={form.control}
            name="deliveryAddress"
            label="Delivery address"
            className="md:col-span-2"
          />
          <TextField control={form.control} name="vehicleNumber" label="Vehicle number" />
          <TextField control={form.control} name="driverName" label="Driver name" />
          <TextField control={form.control} name="driverPhone" label="Driver phone" />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Line items">
        <DispatchLineItemsField productLabelById={productLabelById} />
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Create dispatch
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditDispatchForm({
  dispatchNumber,
  rentalOrderId,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditDispatchFormProps) {
  const { productLabelById } = useDispatchFilterOptions();
  const { data: rentalOrder } = useRentalOrder(rentalOrderId);
  const form = useForm<UpdateDispatchFormValues>({
    resolver: zodResolver(updateDispatchFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!rentalOrder) {
      return;
    }

    const maxByProductId = new Map(
      rentalOrder.items.map((item) => [item.productId, item.reservedQuantity]),
    );

    const currentItems = form.getValues("items");
    form.setValue(
      "items",
      currentItems.map((item) => ({
        ...item,
        maxQuantity: maxByProductId.get(item.productId),
      })),
    );
  }, [rentalOrder, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Dispatch details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dispatch number
            </p>
            <p className="text-sm font-medium">{dispatchNumber}</p>
          </div>
          <DatePickerField control={form.control} name="dispatchDate" label="Dispatch date" />
          <SelectField
            control={form.control}
            name="deliveryMethod"
            label="Delivery method"
            options={deliveryOptions}
          />
          <TextField
            control={form.control}
            name="deliveryAddress"
            label="Delivery address"
            className="md:col-span-2"
          />
          <TextField control={form.control} name="vehicleNumber" label="Vehicle number" />
          <TextField control={form.control} name="driverName" label="Driver name" />
          <TextField control={form.control} name="driverPhone" label="Driver phone" />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Line items">
        <DispatchLineItemsField productLabelById={productLabelById} />
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
