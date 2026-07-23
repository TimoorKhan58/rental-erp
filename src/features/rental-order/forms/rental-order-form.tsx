"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { AppForm } from "@/components/forms";
import {
  DatePickerField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { CreateCustomerDialog } from "@/features/customer/dialogs";
import { useCustomerPermissions } from "@/features/customer/hooks";
import type { CustomerResponse } from "@/features/customer/types";
import {
  createRentalOrderFormSchema,
  updateRentalOrderFormSchema,
  type CreateRentalOrderFormValues,
  type UpdateRentalOrderFormValues,
} from "../schemas";
import { useRentalOrderFilterOptions } from "../hooks";
import { RentalOrderLineItemsField } from "./rental-order-line-items-field";

type RentalOrderFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateRentalOrderFormProps = RentalOrderFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateRentalOrderFormValues>;
  onSubmit: (values: CreateRentalOrderFormValues) => void | Promise<void>;
};

type EditRentalOrderFormProps = RentalOrderFormBaseProps & {
  mode: "edit";
  orderNumber: string;
  defaultValues: UpdateRentalOrderFormValues;
  onSubmit: (values: UpdateRentalOrderFormValues) => void | Promise<void>;
};

export type RentalOrderFormProps = CreateRentalOrderFormProps | EditRentalOrderFormProps;

const createDefaults: CreateRentalOrderFormValues = {
  orderNumber: "",
  customerId: "",
  warehouseId: "",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  bookInAdvance: false,
  remarks: "",
  items: [
    {
      productId: "",
      quantity: 1,
      dailyRate: 1,
      useCustomDates: false,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

type CustomerOption = { id: string; label: string };

function mergeCustomerOptions(
  base: CustomerOption[],
  extra: CustomerOption[],
): CustomerOption[] {
  const byId = new Map<string, CustomerOption>();
  for (const option of [...extra, ...base]) {
    byId.set(option.id, option);
  }
  return Array.from(byId.values());
}

function customerToOption(customer: CustomerResponse): CustomerOption {
  return {
    id: customer.id,
    label: `${customer.customerCode} — ${customer.name}`,
  };
}

export function RentalOrderForm(props: RentalOrderFormProps) {
  if (props.mode === "create") {
    return <CreateRentalOrderForm {...props} />;
  }

  return <EditRentalOrderForm {...props} />;
}

function CreateRentalOrderForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateRentalOrderFormProps) {
  const { customerOptions, warehouseOptions, productOptions } = useRentalOrderFilterOptions();
  const { canCreate: canCreateCustomer } = useCustomerPermissions();
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [extraCustomerOptions, setExtraCustomerOptions] = useState<CustomerOption[]>([]);
  const form = useForm<CreateRentalOrderFormValues>({
    resolver: zodResolver(createRentalOrderFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const bookInAdvance = form.watch("bookInAdvance");
  const mergedCustomerOptions = useMemo(
    () => mergeCustomerOptions(customerOptions, extraCustomerOptions),
    [customerOptions, extraCustomerOptions],
  );

  const handleCustomerCreated = (customer: CustomerResponse) => {
    setExtraCustomerOptions((prev) => mergeCustomerOptions(prev, [customerToOption(customer)]));
    form.setValue("customerId", customer.id, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <>
      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard title="Rental order details">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              control={form.control}
              name="orderNumber"
              label="Order number"
              placeholder="e.g. RO-2026-001"
              description="Unique identifier for this rental order."
            />
            <div className="space-y-2">
              <SelectField
                control={form.control}
                name="customerId"
                label="Customer"
                placeholder="Select customer"
                options={mergedCustomerOptions.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
              />
              {canCreateCustomer ? (
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
                  onClick={() => setCreateCustomerOpen(true)}
                >
                  New customer
                </AppButton>
              ) : null}
            </div>
            <SelectField
              control={form.control}
              name="warehouseId"
              label="Warehouse"
              placeholder="Select warehouse"
              options={warehouseOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
            <SwitchField
              control={form.control}
              name="bookInAdvance"
              label="Book in advance"
              description="Reserve future dates on the reservation calendar (e.g. 30 July)."
              className="md:col-span-2"
            />
            <DatePickerField
              control={form.control}
              name="startDate"
              label={bookInAdvance ? "Reservation start date" : "Rental start date"}
            />
            <DatePickerField
              control={form.control}
              name="endDate"
              label={bookInAdvance ? "Reservation end date" : "Rental end date"}
            />
            <TextAreaField
              control={form.control}
              name="remarks"
              label="Remarks"
              className="md:col-span-2"
            />
          </div>
        </SectionCard>

        <SectionCard title="Line items">
          <RentalOrderLineItemsField
            productOptions={productOptions}
            startDate={startDate}
            endDate={endDate}
          />
        </SectionCard>

        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={onCancel}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={isSubmitting}>
            {bookInAdvance ? "Create advance booking" : "Create rental order"}
          </AppButton>
        </div>
      </AppForm>

      <CreateCustomerDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}

function EditRentalOrderForm({
  orderNumber,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditRentalOrderFormProps) {
  const { customerOptions, warehouseOptions, productOptions } = useRentalOrderFilterOptions();
  const { canCreate: canCreateCustomer } = useCustomerPermissions();
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [extraCustomerOptions, setExtraCustomerOptions] = useState<CustomerOption[]>([]);
  const form = useForm<UpdateRentalOrderFormValues>({
    resolver: zodResolver(updateRentalOrderFormSchema),
    defaultValues,
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const mergedCustomerOptions = useMemo(
    () => mergeCustomerOptions(customerOptions, extraCustomerOptions),
    [customerOptions, extraCustomerOptions],
  );

  const handleCustomerCreated = (customer: CustomerResponse) => {
    setExtraCustomerOptions((prev) => mergeCustomerOptions(prev, [customerToOption(customer)]));
    form.setValue("customerId", customer.id, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <>
      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard title="Rental order details">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Order number
              </p>
              <p className="text-sm font-medium">{orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                Order number cannot be changed after creation.
              </p>
            </div>
            <div className="space-y-2">
              <SelectField
                control={form.control}
                name="customerId"
                label="Customer"
                placeholder="Select customer"
                options={mergedCustomerOptions.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
              />
              {canCreateCustomer ? (
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
                  onClick={() => setCreateCustomerOpen(true)}
                >
                  New customer
                </AppButton>
              ) : null}
            </div>
            <SelectField
              control={form.control}
              name="warehouseId"
              label="Warehouse"
              placeholder="Select warehouse"
              options={warehouseOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
            <DatePickerField control={form.control} name="startDate" label="Rental start date" />
            <DatePickerField control={form.control} name="endDate" label="Rental end date" />
            <TextAreaField
              control={form.control}
              name="remarks"
              label="Remarks"
              className="md:col-span-2"
            />
          </div>
        </SectionCard>

        <SectionCard title="Line items">
          <RentalOrderLineItemsField
            productOptions={productOptions}
            startDate={startDate}
            endDate={endDate}
          />
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

      <CreateCustomerDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}
