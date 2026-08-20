"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { AppModal } from "@/components/design-system/modal";
import { Input } from "@/components/ui/input";
import {
  createProductFormSchema,
  updateProductFormSchema,
  type CreateProductFormValues,
  type UpdateProductFormValues,
} from "../schemas";
import {
  useCatalogPermissions,
  useCreateBrandOption,
  useCreateCategoryOption,
  useProductCatalogOptions,
  useProductExtendedCatalogOptions,
} from "../hooks";
import { ProductMetadataFields } from "./product-metadata-fields";

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
  tagIds: [],
  images: [],
  specifications: [],
  attributeValues: [],
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
  const { tagOptions, attributeOptions } = useProductExtendedCatalogOptions();
  const { canCreate: canCreateCatalogOption } = useCatalogPermissions();
  const createCategory = useCreateCategoryOption();
  const createBrand = useCreateBrandOption();
  const form = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Product information">
        <p className="mb-4 text-sm text-muted-foreground">
          Code is assigned automatically on save.
        </p>
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
        <CatalogQuickCreate
          canCreate={canCreateCatalogOption}
          onCreateCategory={async (payload) => {
            const created = await createCategory.mutateAsync(payload);
            form.setValue("categoryId", created.id, { shouldDirty: true });
          }}
          onCreateBrand={async (payload) => {
            const created = await createBrand.mutateAsync(payload);
            form.setValue("brandId", created.id, { shouldDirty: true });
          }}
          isCreatingCategory={createCategory.isPending}
          isCreatingBrand={createBrand.isPending}
        />
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

      <ProductMetadataFields tagOptions={tagOptions} attributeOptions={attributeOptions} />

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
  const { tagOptions, attributeOptions } = useProductExtendedCatalogOptions();
  const { canCreate: canCreateCatalogOption } = useCatalogPermissions();
  const createCategory = useCreateCategoryOption();
  const createBrand = useCreateBrandOption();
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
        <CatalogQuickCreate
          canCreate={canCreateCatalogOption}
          onCreateCategory={async (payload) => {
            const created = await createCategory.mutateAsync(payload);
            form.setValue("categoryId", created.id, { shouldDirty: true });
          }}
          onCreateBrand={async (payload) => {
            const created = await createBrand.mutateAsync(payload);
            form.setValue("brandId", created.id, { shouldDirty: true });
          }}
          isCreatingCategory={createCategory.isPending}
          isCreatingBrand={createBrand.isPending}
        />
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

      <ProductMetadataFields tagOptions={tagOptions} attributeOptions={attributeOptions} />

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

type CatalogQuickCreatePayload = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

function CatalogQuickCreate({
  canCreate,
  onCreateCategory,
  onCreateBrand,
  isCreatingCategory,
  isCreatingBrand,
}: {
  canCreate: boolean;
  onCreateCategory: (payload: CatalogQuickCreatePayload) => Promise<void>;
  onCreateBrand: (payload: CatalogQuickCreatePayload) => Promise<void>;
  isCreatingCategory: boolean;
  isCreatingBrand: boolean;
}) {
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [openBrandModal, setOpenBrandModal] = useState(false);

  if (!canCreate) {
    return null;
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AppButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpenCategoryModal(true)}
        >
          Add category
        </AppButton>
        <AppButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpenBrandModal(true)}
        >
          Add brand
        </AppButton>
      </div>

      <CreateCatalogOptionModal
        open={openCategoryModal}
        onOpenChange={setOpenCategoryModal}
        title="New category"
        description="Create a category and assign it to this product."
        submitLabel="Create category"
        isSubmitting={isCreatingCategory}
        onSubmit={async (payload) => {
          await onCreateCategory(payload);
          setOpenCategoryModal(false);
        }}
      />

      <CreateCatalogOptionModal
        open={openBrandModal}
        onOpenChange={setOpenBrandModal}
        title="New brand"
        description="Create a brand and assign it to this product."
        submitLabel="Create brand"
        isSubmitting={isCreatingBrand}
        onSubmit={async (payload) => {
          await onCreateBrand(payload);
          setOpenBrandModal(false);
        }}
      />
    </>
  );
}

function CreateCatalogOptionModal({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (payload: CatalogQuickCreatePayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");

  const handleCreate = async () => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      return;
    }

    await onSubmit({
      name: normalizedName,
      description: details.trim() ? details.trim() : null,
      isActive: true,
    });

    setName("");
    setDetails("");
  };

  return (
    <AppModal
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setName("");
          setDetails("");
        }
      }}
      title={title}
      description={description}
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor={`${title}-name`}>
            Name
          </label>
          <Input
            id={`${title}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="Enter name"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor={`${title}-description`}>
            Description (optional)
          </label>
          <Input
            id={`${title}-description`}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Short description"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end gap-2">
          <AppButton
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AppButton>
          <AppButton type="button" loading={isSubmitting} onClick={() => void handleCreate()}>
            {submitLabel}
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
}
