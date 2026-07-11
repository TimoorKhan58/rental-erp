"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  NumberField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  createProductFormSchema,
  updateProductFormSchema,
  type CreateProductFormValues,
  type UpdateProductFormValues,
} from "../schemas";
import { useProductCatalogOptions } from "../hooks";

type ProductFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateProductFormProps = ProductFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateProductFormValues>;
  onSubmit: (values: CreateProductFormValues) => void | Promise<void>;
};

type EditProductFormProps = ProductFormBaseProps & {
  mode: "edit";
  defaultValues: UpdateProductFormValues;
  onSubmit: (values: UpdateProductFormValues) => void | Promise<void>;
};

export type ProductFormProps = CreateProductFormProps | EditProductFormProps;

const noneOption = { value: "", label: "None" };

const createDefaults: CreateProductFormValues = {
  productCode: "",
  name: "",
  description: "",
  unit: "",
  rentalRate: 1,
  replacementCost: null,
  categoryId: "",
  brandId: "",
  unitId: "",
  isActive: true,
};

export function ProductForm(props: ProductFormProps) {
  if (props.mode === "create") {
    return <CreateProductForm {...props} />;
  }

  return <EditProductForm {...props} />;
}

function CreateProductForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateProductFormProps) {
  const { categoryOptions, brandOptions, unitOptions } = useProductCatalogOptions();
  const form = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Product information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="productCode"
            label="Product code"
            placeholder="e.g. PRD-001"
            description="Unique identifier for this product."
          />
          <TextField
            control={form.control}
            name="name"
            label="Product name"
            placeholder="Product name"
          />
          <TextField
            control={form.control}
            name="unit"
            label="Unit"
            placeholder="e.g. day, piece, set"
            description="Rental unit of measure."
          />
        </div>
      </SectionCard>

      <SectionCard title="Pricing">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            control={form.control}
            name="rentalRate"
            label="Rental rate"
            min={0}
            step={0.01}
            description="Daily rental rate."
          />
          <NumberField
            control={form.control}
            name="replacementCost"
            label="Replacement cost"
            min={0}
            step={0.01}
            description="Optional replacement value."
          />
        </div>
      </SectionCard>

      <SectionCard title="Classification">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            control={form.control}
            name="categoryId"
            label="Category"
            placeholder="Select category"
            options={[noneOption, ...categoryOptions]}
          />
          <SelectField
            control={form.control}
            name="brandId"
            label="Brand"
            placeholder="Select brand"
            options={[noneOption, ...brandOptions]}
          />
          <SelectField
            control={form.control}
            name="unitId"
            label="Catalog unit"
            placeholder="Select unit"
            description="Optional catalog unit reference."
            options={[noneOption, ...unitOptions]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Description">
        <TextAreaField
          control={form.control}
          name="description"
          label="Description"
          rows={4}
        />
      </SectionCard>

      <SectionCard title="Status">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active product"
          description="Inactive products are not available for new rentals."
        />
      </SectionCard>

      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Create product" />
    </AppForm>
  );
}

function EditProductForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditProductFormProps) {
  const { categoryOptions, brandOptions, unitOptions } = useProductCatalogOptions();
  const form = useForm<UpdateProductFormValues>({
    resolver: zodResolver(updateProductFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Product information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Product name"
            placeholder="Product name"
          />
          <TextField
            control={form.control}
            name="unit"
            label="Unit"
            placeholder="e.g. day, piece, set"
            description="Rental unit of measure."
          />
        </div>
      </SectionCard>

      <SectionCard title="Pricing">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            control={form.control}
            name="rentalRate"
            label="Rental rate"
            min={0}
            step={0.01}
            description="Daily rental rate."
          />
          <NumberField
            control={form.control}
            name="replacementCost"
            label="Replacement cost"
            min={0}
            step={0.01}
            description="Optional replacement value."
          />
        </div>
      </SectionCard>

      <SectionCard title="Classification">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            control={form.control}
            name="categoryId"
            label="Category"
            placeholder="Select category"
            options={[noneOption, ...categoryOptions]}
          />
          <SelectField
            control={form.control}
            name="brandId"
            label="Brand"
            placeholder="Select brand"
            options={[noneOption, ...brandOptions]}
          />
          <SelectField
            control={form.control}
            name="unitId"
            label="Catalog unit"
            placeholder="Select unit"
            description="Optional catalog unit reference."
            options={[noneOption, ...unitOptions]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Description">
        <TextAreaField
          control={form.control}
          name="description"
          label="Description"
          rows={4}
        />
      </SectionCard>

      <SectionCard title="Status">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active product"
          description="Inactive products are not available for new rentals."
        />
      </SectionCard>

      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Save changes" />
    </AppForm>
  );
}

function FormActions({
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <AppButton type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </AppButton>
      <AppButton type="submit" loading={isSubmitting}>
        {submitLabel}
      </AppButton>
    </div>
  );
}
