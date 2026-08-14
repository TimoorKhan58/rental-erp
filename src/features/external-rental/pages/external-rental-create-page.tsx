"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import {
  DatePickerField,
  SelectField,
  TextAreaField,
} from "@/components/design-system/form";
import { AppForm } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { useRentalOrder } from "@/features/rental-order/hooks";
import {
  useCreateExternalRental,
  useExternalRentalFilterOptions,
} from "../hooks";

type CreateFormValues = {
  supplierId: string;
  warehouseId: string;
  rentalOrderId: string;
  hireStartDate: string;
  hireEndDate: string;
  expectedReturnToSupplierDate: string;
  remarks: string;
  items: Array<{
    productId: string;
    rentalOrderItemId: string;
    quantityRequested: number;
    unitCost: number;
  }>;
};

export function ExternalRentalCreatePage() {
  const router = useRouter();
  const createMutation = useCreateExternalRental();
  const {
    supplierOptions,
    warehouseOptions,
    productOptions,
    productLabelById,
    rentalOrderOptions,
  } = useExternalRentalFilterOptions();

  const form = useForm<CreateFormValues>({
    defaultValues: {
      supplierId: "",
      warehouseId: "",
      rentalOrderId: "",
      hireStartDate: new Date().toISOString(),
      hireEndDate: new Date().toISOString(),
      expectedReturnToSupplierDate: new Date().toISOString(),
      remarks: "",
      items: [
        {
          productId: "",
          rentalOrderItemId: "",
          quantityRequested: 1,
          unitCost: 0,
        },
      ],
    },
  });

  const rentalOrderId = form.watch("rentalOrderId");
  const { data: rentalOrder, isLoading: isOrderLoading } =
    useRentalOrder(rentalOrderId);

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedOrderMeta = useMemo(
    () => rentalOrderOptions.find((option) => option.id === rentalOrderId),
    [rentalOrderId, rentalOrderOptions],
  );

  const orderItemOptions = useMemo(() => {
    const items = rentalOrder?.items ?? [];
    return items.map((item) => {
      const productLabel =
        productLabelById.get(item.productId) ??
        productOptions.find((option) => option.id === item.productId)?.label ??
        item.productId;
      return {
        value: item.id,
        label: `${productLabel} · qty ${item.quantity}`,
        productId: item.productId,
        quantity: item.quantity,
      };
    });
  }, [productLabelById, productOptions, rentalOrder?.items]);

  useEffect(() => {
    if (!rentalOrderId || !selectedOrderMeta) {
      return;
    }

    form.setValue("warehouseId", selectedOrderMeta.warehouseId);
    form.setValue("hireStartDate", selectedOrderMeta.startDate);
    form.setValue("hireEndDate", selectedOrderMeta.endDate);
    form.setValue(
      "expectedReturnToSupplierDate",
      selectedOrderMeta.endDate,
    );
  }, [form, rentalOrderId, selectedOrderMeta]);

  useEffect(() => {
    if (!rentalOrderId || isOrderLoading) {
      return;
    }

    if (!rentalOrder?.items?.length) {
      replace([
        {
          productId: "",
          rentalOrderItemId: "",
          quantityRequested: 1,
          unitCost: 0,
        },
      ]);
      return;
    }

    const first = rentalOrder.items[0];
    replace([
      {
        productId: first.productId,
        rentalOrderItemId: first.id,
        quantityRequested: first.quantity,
        unitCost: 0,
      },
    ]);
  }, [isOrderLoading, rentalOrderId, rentalOrder?.id, rentalOrder?.items, replace]);

  const watchedItems = form.watch("items");

  useEffect(() => {
    if (!orderItemOptions.length) {
      return;
    }

    watchedItems.forEach((item, index) => {
      if (!item.rentalOrderItemId) {
        return;
      }

      const option = orderItemOptions.find(
        (entry) => entry.value === item.rentalOrderItemId,
      );
      if (!option) {
        return;
      }

      if (item.productId !== option.productId) {
        form.setValue(`items.${index}.productId`, option.productId);
        form.setValue(`items.${index}.quantityRequested`, option.quantity);
      }
    });
  }, [form, orderItemOptions, watchedItems]);

  const onSubmit = async (values: CreateFormValues) => {
    if (!values.rentalOrderId) {
      form.setError("rentalOrderId", { message: "Select a rental order" });
      return;
    }

    if (!values.supplierId) {
      form.setError("supplierId", { message: "Select a supplier" });
      return;
    }

    if (!values.warehouseId) {
      form.setError("warehouseId", { message: "Select a warehouse" });
      return;
    }

    const incompleteLine = values.items.find(
      (item) => !item.rentalOrderItemId || !item.productId,
    );
    if (incompleteLine) {
      form.setError("items", {
        message: "Select a rental order line for each item",
      });
      return;
    }

    const created = await createMutation.mutateAsync({
      supplierId: values.supplierId,
      warehouseId: values.warehouseId,
      rentalOrderId: values.rentalOrderId,
      hireStartDate: values.hireStartDate,
      hireEndDate: values.hireEndDate,
      expectedReturnToSupplierDate: values.expectedReturnToSupplierDate,
      remarks: values.remarks || null,
      items: values.items.map((item) => ({
        productId: item.productId,
        rentalOrderItemId: item.rentalOrderItemId,
        quantityRequested: Number(item.quantityRequested),
        unitCost: Number(item.unitCost),
      })),
    });
    router.push(ROUTES.externalRentalDetail(created.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="New external rental"
        description="Pick a rental order, then enter supplier hire-in quantities and unit cost. No UUIDs needed."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "External Rentals", href: ROUTES.externalRentals },
          { label: "New agreement" },
        ]}
      />

      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard title="Agreement details">
          <div className="grid gap-4 md:grid-cols-2">
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
              name="supplierId"
              label="Supplier"
              placeholder="Select supplier"
              options={supplierOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
            <SelectField
              control={form.control}
              name="warehouseId"
              label="Warehouse"
              placeholder="Filled from rental order"
              options={warehouseOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
            <DatePickerField
              control={form.control}
              name="hireStartDate"
              label="Hire start"
            />
            <DatePickerField
              control={form.control}
              name="hireEndDate"
              label="Hire end"
            />
            <DatePickerField
              control={form.control}
              name="expectedReturnToSupplierDate"
              label="Expected return to supplier"
            />
            <div className="md:col-span-2">
              <TextAreaField
                control={form.control}
                name="remarks"
                label="Remarks"
              />
            </div>
          </div>
          {rentalOrderId && isOrderLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Loading rental order lines…
            </p>
          ) : null}
          {rentalOrderId && !isOrderLoading && orderItemOptions.length === 0 ? (
            <p className="mt-3 text-sm text-destructive">
              This rental order has no line items.
            </p>
          ) : null}
        </SectionCard>

        <SectionCard title="Line items">
          <p className="mb-4 text-sm text-muted-foreground">
            Choose lines from the selected rental order. Product and RO item are
            filled automatically — enter hire qty and unit cost only.
          </p>
          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedItemId = form.watch(
                `items.${index}.rentalOrderItemId`,
              );
              const selectedOrderItem = orderItemOptions.find(
                (option) => option.value === selectedItemId,
              );

              return (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-md border p-3 md:grid-cols-4"
                >
                  <SelectField
                    control={form.control}
                    name={`items.${index}.rentalOrderItemId`}
                    label="Order line"
                    placeholder={
                      rentalOrderId
                        ? "Select order line"
                        : "Select rental order first"
                    }
                    options={orderItemOptions}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product</label>
                    <Input
                      readOnly
                      value={
                        selectedOrderItem
                          ? (productLabelById.get(selectedOrderItem.productId) ??
                            selectedOrderItem.label)
                          : ""
                      }
                      placeholder="From order line"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Qty requested</label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedOrderItem?.quantity}
                      {...form.register(`items.${index}.quantityRequested`, {
                        valueAsNumber: true,
                        required: true,
                      })}
                    />
                    {selectedOrderItem ? (
                      <p className="text-xs text-muted-foreground">
                        Order qty: {selectedOrderItem.quantity}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit cost</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...form.register(`items.${index}.unitCost`, {
                        valueAsNumber: true,
                        required: true,
                      })}
                    />
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    <AppButton
                      type="button"
                      variant="outline"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      Remove
                    </AppButton>
                  </div>
                </div>
              );
            })}
            <AppButton
              type="button"
              variant="outline"
              disabled={!rentalOrderId || orderItemOptions.length === 0}
              onClick={() => {
                const unused = orderItemOptions.find(
                  (option) =>
                    !form
                      .getValues("items")
                      .some((item) => item.rentalOrderItemId === option.value),
                );
                const next = unused ?? orderItemOptions[0];
                if (!next) {
                  return;
                }
                append({
                  productId: next.productId,
                  rentalOrderItemId: next.value,
                  quantityRequested: next.quantity,
                  unitCost: 0,
                });
              }}
            >
              Add line
            </AppButton>
          </div>
        </SectionCard>

        <div className="flex justify-end gap-2">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => router.push(ROUTES.externalRentals)}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" loading={createMutation.isPending}>
            Create agreement
          </AppButton>
        </div>
      </AppForm>
    </PageContainer>
  );
}
