"use client";

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
  const { supplierOptions, warehouseOptions, productOptions } =
    useExternalRentalFilterOptions();

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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = async (values: CreateFormValues) => {
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
        description="Create a hire-in agreement linked to a rental order."
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
              placeholder="Select warehouse"
              options={warehouseOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Rental order ID</label>
              <Input
                {...form.register("rentalOrderId", { required: true })}
                placeholder="UUID of rental order"
              />
            </div>
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
        </SectionCard>

        <SectionCard title="Line items">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border p-3 md:grid-cols-5"
              >
                <SelectField
                  control={form.control}
                  name={`items.${index}.productId`}
                  label="Product"
                  placeholder="Select product"
                  options={productOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">RO item ID</label>
                  <Input
                    {...form.register(`items.${index}.rentalOrderItemId`, {
                      required: true,
                    })}
                    placeholder="UUID"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Qty requested</label>
                  <Input
                    type="number"
                    min={1}
                    {...form.register(`items.${index}.quantityRequested`, {
                      valueAsNumber: true,
                      required: true,
                    })}
                  />
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
                <div className="flex items-end">
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
            ))}
            <AppButton
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  productId: "",
                  rentalOrderItemId: "",
                  quantityRequested: 1,
                  unitCost: 0,
                })
              }
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
