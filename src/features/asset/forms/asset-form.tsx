"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { AppForm } from "@/components/forms";
import {
  DatePickerField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  createAssetFormSchema,
  updateAssetFormSchema,
  type CreateAssetFormValues,
  type UpdateAssetFormValues,
} from "../schemas";
import { generateAssetCode } from "../mappers";
import { useAssetFilterOptions, useAssetPermissions } from "../hooks";
import { CreateAssetCategoryDialog } from "../components";

type AssetFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateAssetFormProps = AssetFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateAssetFormValues>;
  onSubmit: (values: CreateAssetFormValues) => void | Promise<void>;
};

type EditAssetFormProps = AssetFormBaseProps & {
  mode: "edit";
  assetCode: string;
  defaultValues: UpdateAssetFormValues;
  onSubmit: (values: UpdateAssetFormValues) => void | Promise<void>;
};

export type AssetFormProps = CreateAssetFormProps | EditAssetFormProps;

const createDefaults = {
  assetCode: generateAssetCode(),
  name: "",
  categoryId: "",
  serialNumber: "",
  purchaseDate: new Date().toISOString(),
  residualValue: 0,
  usefulLifeMonths: 36,
  warehouseId: "",
  assignedEmployeeId: "",
  vendorId: "",
  notes: "",
} as CreateAssetFormValues;

export function AssetForm(props: AssetFormProps) {
  if (props.mode === "create") {
    return <CreateAssetForm {...props} />;
  }
  return <EditAssetForm {...props} />;
}

function AssetFormFields({
  form,
  assetCode,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: ReturnType<typeof useForm<any>>;
  assetCode?: string;
}) {
  const { canCreateCategory } = useAssetPermissions();
  const {
    categoryOptions,
    warehouseOptions,
    vendorOptions,
    employeeOptions,
  } = useAssetFilterOptions();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  return (
    <>
      <SectionCard title="Asset details">
        {assetCode ? (
          <dl className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Asset code
              </dt>
              <dd className="text-sm font-medium">{assetCode}</dd>
            </div>
          </dl>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {!assetCode ? (
            <TextField
              control={form.control}
              name="assetCode"
              label="Asset code"
              placeholder="e.g. AST-20260806-0001"
            />
          ) : null}

          <TextField
            control={form.control}
            name="name"
            label="Name"
            placeholder="Asset name"
          />

          <div className="space-y-2">
            <SelectField
              control={form.control}
              name="categoryId"
              label="Category"
              placeholder="Select category"
              options={categoryOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
            {canCreateCategory ? (
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<PlusIcon className="size-3.5" aria-hidden="true" />}
                onClick={() => setCategoryDialogOpen(true)}
              >
                New category
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

          <TextField
            control={form.control}
            name="serialNumber"
            label="Serial number"
            placeholder="Optional"
          />

          <DatePickerField
            control={form.control}
            name="purchaseDate"
            label="Purchase date"
          />

          <NumberField
            control={form.control}
            name="purchaseCost"
            label="Purchase cost"
            min={0}
            step={0.01}
          />

          <NumberField
            control={form.control}
            name="residualValue"
            label="Residual value"
            min={0}
            step={0.01}
          />

          <NumberField
            control={form.control}
            name="usefulLifeMonths"
            label="Useful life (months)"
            min={1}
            step={1}
          />

          <SelectField
            control={form.control}
            name="vendorId"
            label="Purchase vendor"
            placeholder="Optional"
            options={[
              { value: "", label: "None" },
              ...vendorOptions.map((option) => ({
                value: option.id,
                label: option.label,
              })),
            ]}
          />

          <SelectField
            control={form.control}
            name="assignedEmployeeId"
            label="Assigned employee"
            placeholder="Optional"
            options={[
              { value: "", label: "None" },
              ...employeeOptions.map((option) => ({
                value: option.id,
                label: option.label,
              })),
            ]}
          />

          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            className="md:col-span-2"
            placeholder="Optional notes"
          />
        </div>
      </SectionCard>

      <CreateAssetCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />
    </>
  );
}

function CreateAssetForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateAssetFormProps) {
  const form = useForm<CreateAssetFormValues>({
    resolver: zodResolver(createAssetFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <AssetFormFields form={form} />
      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Register asset
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditAssetForm({
  assetCode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditAssetFormProps) {
  const form = useForm<UpdateAssetFormValues>({
    resolver: zodResolver(updateAssetFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <AssetFormFields form={form} assetCode={assetCode} />
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
