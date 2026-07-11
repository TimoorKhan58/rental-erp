"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  NumberField,
  SelectField,
  SwitchField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  createInventoryFormSchema,
  updateInventoryFormSchema,
  type CreateInventoryFormValues,
  type UpdateInventoryFormValues,
} from "../schemas";
import { useInventoryFilterOptions } from "../hooks";

type InventoryFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateInventoryFormProps = InventoryFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateInventoryFormValues>;
  onSubmit: (values: CreateInventoryFormValues) => void | Promise<void>;
};

type EditInventoryFormProps = InventoryFormBaseProps & {
  mode: "edit";
  defaultValues: UpdateInventoryFormValues;
  onSubmit: (values: UpdateInventoryFormValues) => void | Promise<void>;
};

export type InventoryFormProps = CreateInventoryFormProps | EditInventoryFormProps;

const createDefaults: CreateInventoryFormValues = {
  productId: "",
  warehouseId: "",
  quantityOnHand: 0,
  reservedQuantity: 0,
  minimumStock: 0,
  maximumStock: null,
  isActive: true,
};

export function InventoryForm(props: InventoryFormProps) {
  if (props.mode === "create") {
    return <CreateInventoryForm {...props} />;
  }

  return <EditInventoryForm {...props} />;
}

function CreateInventoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateInventoryFormProps) {
  const { productOptions, warehouseOptions } = useInventoryFilterOptions();
  const form = useForm<CreateInventoryFormValues>({
    resolver: zodResolver(createInventoryFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Assignment">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            control={form.control}
            name="productId"
            label="Product"
            placeholder="Select product"
            options={productOptions.map((option) => ({
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
        </div>
      </SectionCard>

      <SectionCard title="Stock levels">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            control={form.control}
            name="quantityOnHand"
            label="Quantity on hand"
            min={0}
            step={1}
          />
          <NumberField
            control={form.control}
            name="reservedQuantity"
            label="Reserved quantity"
            min={0}
            step={1}
          />
          <NumberField
            control={form.control}
            name="minimumStock"
            label="Reorder level"
            min={0}
            step={1}
          />
          <NumberField
            control={form.control}
            name="maximumStock"
            label="Maximum stock"
            min={0}
            step={1}
            description="Leave empty for no maximum."
          />
          <SwitchField
            control={form.control}
            name="isActive"
            label="Active"
            description="Inactive records are hidden from operational workflows."
          />
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Create record
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditInventoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditInventoryFormProps) {
  const form = useForm<UpdateInventoryFormValues>({
    resolver: zodResolver(updateInventoryFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Stock levels">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            control={form.control}
            name="quantityOnHand"
            label="Quantity on hand"
            min={0}
            step={1}
          />
          <NumberField
            control={form.control}
            name="reservedQuantity"
            label="Reserved quantity"
            min={0}
            step={1}
          />
          <NumberField
            control={form.control}
            name="minimumStock"
            label="Reorder level"
            min={0}
            step={1}
          />
          <NumberField
            control={form.control}
            name="maximumStock"
            label="Maximum stock"
            min={0}
            step={1}
            description="Leave empty for no maximum."
          />
          <SwitchField
            control={form.control}
            name="isActive"
            label="Active"
            description="Inactive records are hidden from operational workflows."
          />
        </div>
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
