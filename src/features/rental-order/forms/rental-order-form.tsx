"use client";

import { calendarDayToIso } from "@/lib/utils/local-date";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { AppForm } from "@/components/forms";
import {
  ComboboxField,
  DatePickerField,
  SelectField,
  SwitchField,
  TextAreaField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { RentalOrderFormSummary } from "../components/rental-order-form-summary";
import { RentalOrderLineItemsField } from "./rental-order-line-items-field";
import { cn } from "@/lib/utils";

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
  excludeRentalOrderId?: string;
  defaultValues: UpdateRentalOrderFormValues;
  onSubmit: (values: UpdateRentalOrderFormValues) => void | Promise<void>;
};

export type RentalOrderFormProps = CreateRentalOrderFormProps | EditRentalOrderFormProps;

/** Today to tomorrow as whole calendar days, made when the form opens (R3). */
const DAY_MS = 86_400_000;

/**
 * When the start date moves past the end date, move the end to the day after
 * the start (QA: start 28 Nov with end still 20 Nov read "Nov 28 – Nov 20").
 */
export function endDateAfterStart(startDate?: string, endDate?: string): string | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  if (Number.isNaN(start) || new Date(endDate).getTime() >= start) return null;
  return new Date(start + DAY_MS).toISOString();
}

function createDefaults(): CreateRentalOrderFormValues {
  const now = new Date();
  const startDate = calendarDayToIso(now);
  const endDate = calendarDayToIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  return {
    orderNumber: "",
    customerId: "",
    warehouseId: "",
    startDate,
    endDate,
    bookInAdvance: false,
    remarks: "",
    items: [{ productId: "", quantity: 1, dailyRate: 0, useCustomDates: false, startDate, endDate }],
  };
}

type CustomerOption = { id: string; label: string; keywords?: string };

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
    keywords: customer.phone,
  };
}

function SectionHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
        {step}
      </span>
      <div className="min-w-0">
        <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
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
    defaultValues: { ...createDefaults(), ...defaultValues },
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const bookInAdvance = form.watch("bookInAdvance");

  useEffect(() => {
    const next = endDateAfterStart(startDate, endDate);
    if (next) form.setValue("endDate", next, { shouldDirty: true, shouldValidate: true });
  }, [endDate, form, startDate]);
  const customerId = form.watch("customerId");
  const warehouseId = form.watch("warehouseId");
  const formError = form.formState.errors.root?.message;

  // With only one warehouse there is nothing to choose: pick it for them.
  useEffect(() => {
    if (!warehouseId && warehouseOptions.length === 1) {
      form.setValue("warehouseId", warehouseOptions[0]!.id, { shouldValidate: true });
    }
  }, [warehouseId, warehouseOptions, form]);

  const mergedCustomerOptions = useMemo(
    () => mergeCustomerOptions(customerOptions, extraCustomerOptions),
    [customerOptions, extraCustomerOptions],
  );

  const customerLabel = mergedCustomerOptions.find((o) => o.id === customerId)?.label;
  const warehouseLabel = warehouseOptions.find((o) => o.id === warehouseId)?.label;

  const handleCustomerCreated = (customer: CustomerResponse) => {
    setExtraCustomerOptions((prev) => mergeCustomerOptions(prev, [customerToOption(customer)]));
    form.setValue("customerId", customer.id, { shouldValidate: true, shouldDirty: true });
  };

  const submitLabel = bookInAdvance ? "Create advance booking" : "Create rental order";

  return (
    <>
      <AppForm
        form={form}
        onSubmit={onSubmit}
        className={cn(
          "app-grid pb-24 lg:items-start lg:pb-0 [&>*:first-child]:lg:col-span-8 [&>*:last-child]:lg:col-span-4 [&>*]:sm:col-span-6",
        )}
      >
        <div className="space-y-5">
          {formError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <Card className="border-border">
            <CardContent className="p-4 md:p-5">
            <SectionHeading
              step={1}
              title="Customer & warehouse"
              description="Who is renting, and which warehouse fulfills the order."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <ComboboxField
                  control={form.control}
                  name="customerId"
                  label="Customer"
                  placeholder="Select customer"
                  searchPlaceholder="Search by name, code, or phone..."
                  emptyMessage="No matching customers."
                  options={mergedCustomerOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                    keywords: option.keywords,
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
            </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 md:p-5">
            <SectionHeading
              step={2}
              title="Rental period"
              description="Set the rental window. Advance booking reserves future calendar dates."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <SwitchField
                control={form.control}
                name="bookInAdvance"
                label="This is a future booking"
                description="Turn on when the event is later. The dates are then held for this customer on the booking calendar."
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
                minDate={startDate}
              />
            </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 md:p-5">
            <SectionHeading
              step={3}
              title="Items"
              description="Add the items, how many and the daily rate. RentCore shows how many are free for your dates."
            />
            <RentalOrderLineItemsField
              productOptions={productOptions}
              startDate={startDate}
              endDate={endDate}
            />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 md:p-5">
            <SectionHeading
              step={4}
              title="Review"
              description="Optional remarks, then confirm the summary and create the order."
            />
            <TextAreaField
              control={form.control}
              name="remarks"
              label="Remarks"
              placeholder="Delivery notes, event details, special instructions…"
            />
            <p className="mt-3 text-[length:var(--text-caption)] text-muted-foreground">
              The order number is given when you save. The total here is quantity × daily rate ×
              days; the saved order and invoice use the same rule.
            </p>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4">
          <RentalOrderFormSummary
            mode="create"
            isSubmitting={isSubmitting}
            submitLabel={submitLabel}
            onCancel={onCancel}
            customerLabel={customerLabel}
            warehouseLabel={warehouseLabel}
          />
        </aside>
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
  excludeRentalOrderId,
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
  const customerId = form.watch("customerId");
  const warehouseId = form.watch("warehouseId");

  useEffect(() => {
    const next = endDateAfterStart(startDate, endDate);
    if (next) form.setValue("endDate", next, { shouldDirty: true, shouldValidate: true });
  }, [endDate, form, startDate]);

  const mergedCustomerOptions = useMemo(
    () => mergeCustomerOptions(customerOptions, extraCustomerOptions),
    [customerOptions, extraCustomerOptions],
  );

  const customerLabel = mergedCustomerOptions.find((o) => o.id === customerId)?.label;
  const warehouseLabel = warehouseOptions.find((o) => o.id === warehouseId)?.label;

  const handleCustomerCreated = (customer: CustomerResponse) => {
    setExtraCustomerOptions((prev) => mergeCustomerOptions(prev, [customerToOption(customer)]));
    form.setValue("customerId", customer.id, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <>
      <AppForm
        form={form}
        onSubmit={onSubmit}
        className={cn(
          "app-grid pb-24 lg:items-start lg:pb-0 [&>*:first-child]:lg:col-span-8 [&>*:last-child]:lg:col-span-4 [&>*]:sm:col-span-6",
        )}
      >
        <div className="space-y-5">
          <Card className="border-border">
            <CardContent className="p-4 md:p-5">
            <SectionHeading
              step={1}
              title="Customer & warehouse"
              description={`Editing draft ${orderNumber}. Order number cannot change.`}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 rounded-md border border-border bg-muted/20 px-3 py-2">
                <p className="text-[length:var(--text-caption)] font-medium uppercase tracking-wide text-muted-foreground">
                  Order number
                </p>
                <p className="text-sm font-medium">{orderNumber}</p>
              </div>
              <div className="space-y-2">
                <ComboboxField
                  control={form.control}
                  name="customerId"
                  label="Customer"
                  placeholder="Select customer"
                  searchPlaceholder="Search by name, code, or phone..."
                  emptyMessage="No matching customers."
                  options={mergedCustomerOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                    keywords: option.keywords,
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
            </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 md:p-5">
            <SectionHeading
              step={2}
              title="Rental period"
              description="Update the rental start and end dates."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <DatePickerField control={form.control} name="startDate" label="Rental start date" />
              <DatePickerField control={form.control} name="endDate" label="Rental end date" minDate={startDate} />
            </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 md:p-5">
            <SectionHeading
              step={3}
              title="Items"
              description="Adjust products, quantities, and rates."
            />
            <RentalOrderLineItemsField
              productOptions={productOptions}
              startDate={startDate}
              endDate={endDate}
              excludeRentalOrderId={excludeRentalOrderId}
            />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 md:p-5">
            <SectionHeading
              step={4}
              title="Review"
              description="Confirm remarks and save draft changes."
            />
            <TextAreaField
              control={form.control}
              name="remarks"
              label="Remarks"
              placeholder="Delivery notes, event details, special instructions…"
            />
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4">
          <RentalOrderFormSummary
            mode="edit"
            orderNumber={orderNumber}
            isSubmitting={isSubmitting}
            submitLabel="Save changes"
            onCancel={onCancel}
            customerLabel={customerLabel}
            warehouseLabel={warehouseLabel}
          />
        </aside>
      </AppForm>

      <CreateCustomerDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}
