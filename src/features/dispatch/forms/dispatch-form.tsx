"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  ComboboxField,
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
import { useExternalRentals } from "@/features/external-rental/hooks";
import { DispatchLineItemsField } from "./dispatch-line-items-field";
import { calendarDayToIso } from "@/lib/utils/local-date";

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
  dispatchDate: calendarDayToIso(new Date()),
  deliveryMethod: "DELIVERY",
  vehicleNumber: "",
  driverName: "",
  driverPhone: "",
  deliveryAddress: "",
  remarks: "",
  items: [{ productId: "", rentalOrderItemId: "", quantity: 1, notes: "" }],
};

/** Hired items received for each order line and not yet sent out. */
function hiredQuantityByOrderItem(
  agreements: ReadonlyArray<{
    status: string;
    items: ReadonlyArray<{ rentalOrderItemId: string; quantityAllocated: number; quantityDispatched: number }>;
  }>,
): Map<string, number> {
  const hired = new Map<string, number>();
  for (const agreement of agreements) {
    if (agreement.status === "CANCELLED") {
      continue;
    }
    for (const item of agreement.items) {
      const ready = Math.max(0, item.quantityAllocated - item.quantityDispatched);
      hired.set(item.rentalOrderItemId, (hired.get(item.rentalOrderItemId) ?? 0) + ready);
    }
  }
  return hired;
}

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
  const { eligibleRentalOrderOptions, productLabelById } = useDispatchFilterOptions();
  const form = useForm<CreateDispatchFormValues>({
    resolver: zodResolver(createDispatchFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const rentalOrderId = form.watch("rentalOrderId");
  const { data: rentalOrder } = useRentalOrder(rentalOrderId);
  // Items hired from a supplier for this order can go out too (QA H3: the
  // screen only offered your own reserved stock).
  const { data: hireIns, isLoading: hireInsLoading } = useExternalRentals({
    rentalOrderId: rentalOrderId || undefined,
    pageSize: 20,
  });

  useEffect(() => {
    if (!rentalOrder || (rentalOrderId && hireInsLoading)) {
      return;
    }

    const hiredByOrderItem = hiredQuantityByOrderItem(
      (hireIns?.items ?? []).filter((agreement) => agreement.rentalOrderId === rentalOrder.id),
    );
    const items = rentalOrder.items
      .map((item) => {
        const available = item.reservedQuantity + (hiredByOrderItem.get(item.id) ?? 0);
        return {
          productId: item.productId,
          rentalOrderItemId: item.id,
          quantity: available,
          maxQuantity: available,
          notes: "",
        };
      })
      .filter((item) => item.quantity > 0);

    if (items.length > 0) {
      form.setValue("items", items);
    }
  }, [rentalOrder, rentalOrderId, hireIns, hireInsLoading, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Dispatch details">
        <p className="mb-4 text-sm text-muted-foreground">
          Dispatch number is assigned automatically on save.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <ComboboxField
            control={form.control}
            name="rentalOrderId"
            label="Rental order"
            placeholder="Select rental order"
            searchPlaceholder="Search customer or order number..."
            emptyMessage="No eligible rental orders."
            options={eligibleRentalOrderOptions.map((option) => ({
              value: option.id,
              label: option.label,
              description: option.description,
              keywords: option.keywords,
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
  const { data: hireIns, isLoading: hireInsLoading } = useExternalRentals({
    rentalOrderId,
    pageSize: 20,
  });
  const form = useForm<UpdateDispatchFormValues>({
    resolver: zodResolver(updateDispatchFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!rentalOrder || hireInsLoading) {
      return;
    }

    const hiredByOrderItem = hiredQuantityByOrderItem(
      (hireIns?.items ?? []).filter((agreement) => agreement.rentalOrderId === rentalOrder.id),
    );
    const maxByProductId = new Map(
      rentalOrder.items.map((item) => [
        item.productId,
        item.reservedQuantity + (hiredByOrderItem.get(item.id) ?? 0),
      ]),
    );

    const currentItems = form.getValues("items");
    form.setValue(
      "items",
      currentItems.map((item) => ({
        ...item,
        maxQuantity: maxByProductId.get(item.productId),
      })),
    );
  }, [rentalOrder, hireIns, hireInsLoading, form]);

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
