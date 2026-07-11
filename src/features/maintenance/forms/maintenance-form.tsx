"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useInventory } from "@/features/inventory/hooks";
import { MAINTENANCE_SERVICE_TYPES } from "../types";
import {
  createMaintenanceFormSchema,
  updateMaintenanceFormSchema,
  type CreateMaintenanceFormValues,
  type UpdateMaintenanceFormValues,
} from "../schemas";
import { SERVICE_TYPE_LABELS } from "../mappers";
import { useMaintenanceFilterOptions } from "../hooks";

type MaintenanceFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateMaintenanceFormProps = MaintenanceFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateMaintenanceFormValues>;
  onSubmit: (values: CreateMaintenanceFormValues) => void | Promise<void>;
};

type EditMaintenanceFormProps = MaintenanceFormBaseProps & {
  mode: "edit";
  maintenanceNumber: string;
  productId: string;
  warehouseId: string;
  inventoryId: string;
  defaultValues: UpdateMaintenanceFormValues;
  onSubmit: (values: UpdateMaintenanceFormValues) => void | Promise<void>;
};

export type MaintenanceFormProps = CreateMaintenanceFormProps | EditMaintenanceFormProps;

const serviceTypeOptions = MAINTENANCE_SERVICE_TYPES.map((type) => ({
  value: type,
  label: SERVICE_TYPE_LABELS[type],
}));

const createDefaults: CreateMaintenanceFormValues = {
  maintenanceNumber: "",
  productId: "",
  warehouseId: "",
  inventoryId: "",
  quantity: 1,
  serviceType: "PREVENTIVE",
  scheduledDate: new Date().toISOString(),
  estimatedCost: 0,
  actualCost: 0,
  technician: "",
  vendor: "",
  notes: "",
};

export function MaintenanceForm(props: MaintenanceFormProps) {
  if (props.mode === "create") {
    return <CreateMaintenanceForm {...props} />;
  }

  return <EditMaintenanceForm {...props} />;
}

function CreateMaintenanceForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateMaintenanceFormProps) {
  const { inventoryOptions, productLabelById, warehouseLabelById } =
    useMaintenanceFilterOptions();
  const form = useForm<CreateMaintenanceFormValues>({
    resolver: zodResolver(createMaintenanceFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const inventoryId = form.watch("inventoryId");
  const { data: inventory } = useInventory(inventoryId);

  useEffect(() => {
    if (!inventory) {
      return;
    }

    form.setValue("productId", inventory.productId);
    form.setValue("warehouseId", inventory.warehouseId);
    form.setValue("maxQuantity", inventory.availableQuantity);
    form.setValue(
      "quantity",
      Math.min(form.getValues("quantity"), inventory.availableQuantity),
    );
  }, [inventory, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Maintenance details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="maintenanceNumber"
            label="Maintenance number"
            placeholder="e.g. MNT-2026-001"
            description="Unique identifier for this maintenance job."
          />
          <SelectField
            control={form.control}
            name="inventoryId"
            label="Inventory"
            placeholder="Select inventory record"
            options={inventoryOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
          <SelectField
            control={form.control}
            name="serviceType"
            label="Service type"
            options={serviceTypeOptions}
          />
          <DatePickerField
            control={form.control}
            name="scheduledDate"
            label="Scheduled date"
          />
          <NumberField
            control={form.control}
            name="quantity"
            label="Quantity"
            min={1}
            max={form.watch("maxQuantity")}
            description={
              form.watch("maxQuantity") !== undefined
                ? `Max: ${form.watch("maxQuantity")}`
                : undefined
            }
          />
          <NumberField
            control={form.control}
            name="estimatedCost"
            label="Estimated cost"
            min={0}
            step={0.01}
          />
          <NumberField
            control={form.control}
            name="actualCost"
            label="Actual cost"
            min={0}
            step={0.01}
          />
          <TextField control={form.control} name="technician" label="Technician" />
          <TextField control={form.control} name="vendor" label="Vendor" />
          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Asset context">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Product
            </dt>
            <dd className="text-sm">
              {productLabelById.get(form.watch("productId")) ??
                (form.watch("productId") || "—")}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Warehouse
            </dt>
            <dd className="text-sm">
              {warehouseLabelById.get(form.watch("warehouseId")) ??
                (form.watch("warehouseId") || "—")}
            </dd>
          </div>
        </dl>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Create maintenance
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditMaintenanceForm({
  maintenanceNumber,
  productId,
  warehouseId,
  inventoryId,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditMaintenanceFormProps) {
  const { productLabelById, warehouseLabelById } = useMaintenanceFilterOptions();
  const { data: inventory } = useInventory(inventoryId);
  const form = useForm<UpdateMaintenanceFormValues>({
    resolver: zodResolver(updateMaintenanceFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!inventory) {
      return;
    }

    form.setValue("maxQuantity", inventory.availableQuantity);
  }, [inventory, form]);

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Maintenance details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Maintenance number
            </p>
            <p className="text-sm font-medium">{maintenanceNumber}</p>
          </div>
          <SelectField
            control={form.control}
            name="serviceType"
            label="Service type"
            options={serviceTypeOptions}
          />
          <DatePickerField
            control={form.control}
            name="scheduledDate"
            label="Scheduled date"
          />
          <NumberField
            control={form.control}
            name="quantity"
            label="Quantity"
            min={1}
            max={form.watch("maxQuantity")}
            description={
              form.watch("maxQuantity") !== undefined
                ? `Max: ${form.watch("maxQuantity")}`
                : undefined
            }
          />
          <NumberField
            control={form.control}
            name="estimatedCost"
            label="Estimated cost"
            min={0}
            step={0.01}
          />
          <NumberField
            control={form.control}
            name="actualCost"
            label="Actual cost"
            min={0}
            step={0.01}
          />
          <TextField control={form.control} name="technician" label="Technician" />
          <TextField control={form.control} name="vendor" label="Vendor" />
          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Asset context">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Product
            </dt>
            <dd className="text-sm">{productLabelById.get(productId) ?? productId}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Warehouse
            </dt>
            <dd className="text-sm">{warehouseLabelById.get(warehouseId) ?? warehouseId}</dd>
          </div>
        </dl>
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
