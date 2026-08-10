"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  attributeFormSchema,
  categoryBrandFormSchema,
  tagFormSchema,
  unitFormSchema,
  type AttributeFormValues,
  type CategoryBrandFormValues,
  type TagFormValues,
  type UnitFormValues,
} from "../schemas";
import { CATALOG_TAB_SINGULAR } from "../mappers";
import { useCreateCatalogItem, useUpdateCatalogItem } from "../hooks";
import {
  ATTRIBUTE_DATA_TYPES,
  type AttributeResponse,
  type BrandResponse,
  type CatalogEntityResponse,
  type CatalogTab,
  type CategoryResponse,
  type TagResponse,
  type UnitResponse,
} from "../types";

type CatalogItemDialogProps = {
  tab: CatalogTab;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogEntityResponse | null;
};

function normalizeOptional(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value.trim();
}

export function CatalogItemDialog({
  tab,
  open,
  onOpenChange,
  item = null,
}: CatalogItemDialogProps) {
  const isEdit = Boolean(item);
  const createMutation = useCreateCatalogItem(tab);
  const updateMutation = useUpdateCatalogItem(tab);
  const singular = CATALOG_TAB_SINGULAR[tab];
  const isPending = createMutation.isPending || updateMutation.isPending;

  if (tab === "units") {
    return (
      <UnitDialog
        open={open}
        onOpenChange={onOpenChange}
        item={item as UnitResponse | null}
        isEdit={isEdit}
        isPending={isPending}
        singular={singular}
        onCreate={async (payload) => {
          await createMutation.mutateAsync(payload);
          onOpenChange(false);
        }}
        onUpdate={async (id, payload) => {
          await updateMutation.mutateAsync({ id, payload });
          onOpenChange(false);
        }}
      />
    );
  }

  if (tab === "attributes") {
    return (
      <AttributeDialog
        open={open}
        onOpenChange={onOpenChange}
        item={item as AttributeResponse | null}
        isEdit={isEdit}
        isPending={isPending}
        singular={singular}
        onCreate={async (payload) => {
          await createMutation.mutateAsync(payload);
          onOpenChange(false);
        }}
        onUpdate={async (id, payload) => {
          await updateMutation.mutateAsync({ id, payload });
          onOpenChange(false);
        }}
      />
    );
  }

  if (tab === "tags") {
    return (
      <TagDialog
        open={open}
        onOpenChange={onOpenChange}
        item={item as TagResponse | null}
        isEdit={isEdit}
        isPending={isPending}
        singular={singular}
        onCreate={async (payload) => {
          await createMutation.mutateAsync(payload);
          onOpenChange(false);
        }}
        onUpdate={async (id, payload) => {
          await updateMutation.mutateAsync({ id, payload });
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <CategoryBrandDialog
      open={open}
      onOpenChange={onOpenChange}
      item={item as CategoryResponse | BrandResponse | null}
      isEdit={isEdit}
      isPending={isPending}
      singular={singular}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        onOpenChange(false);
      }}
      onUpdate={async (id, payload) => {
        await updateMutation.mutateAsync({ id, payload });
        onOpenChange(false);
      }}
    />
  );
}

function CategoryBrandDialog({
  open,
  onOpenChange,
  item,
  isEdit,
  isPending,
  singular,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CategoryResponse | BrandResponse | null;
  isEdit: boolean;
  isPending: boolean;
  singular: string;
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<CategoryBrandFormValues>({
    resolver: zodResolver(categoryBrandFormSchema),
    defaultValues: { name: "", description: "", isActive: true },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name ?? "",
        description: item?.description ?? "",
        isActive: item?.isActive ?? true,
      });
    }
  }, [open, item, form]);

  const handleSubmit = async (values: CategoryBrandFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: normalizeOptional(values.description),
      isActive: values.isActive,
    };
    if (isEdit && item) {
      await onUpdate(item.id, payload);
      return;
    }
    await onCreate(payload);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${singular}` : `New ${singular}`}
      size="sm"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <TextField control={form.control} name="name" label="Name" />
        <TextAreaField
          control={form.control}
          name="description"
          label="Description"
          placeholder="Optional"
        />
        <CheckboxField control={form.control} name="isActive" label="Active" />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create"}
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}

function UnitDialog({
  open,
  onOpenChange,
  item,
  isEdit,
  isPending,
  singular,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: UnitResponse | null;
  isEdit: boolean;
  isPending: boolean;
  singular: string;
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { code: "", name: "", description: "", isActive: true },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: item?.code ?? "",
        name: item?.name ?? "",
        description: item?.description ?? "",
        isActive: item?.isActive ?? true,
      });
    }
  }, [open, item, form]);

  const handleSubmit = async (values: UnitFormValues) => {
    const payload = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: normalizeOptional(values.description),
      isActive: values.isActive,
    };
    if (isEdit && item) {
      await onUpdate(item.id, payload);
      return;
    }
    await onCreate(payload);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${singular}` : `New ${singular}`}
      size="sm"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <TextField
          control={form.control}
          name="code"
          label="Code"
          placeholder="e.g. DAY"
          disabled={isEdit}
        />
        <TextField control={form.control} name="name" label="Name" />
        <TextAreaField
          control={form.control}
          name="description"
          label="Description"
          placeholder="Optional"
        />
        <CheckboxField control={form.control} name="isActive" label="Active" />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create"}
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}

function AttributeDialog({
  open,
  onOpenChange,
  item,
  isEdit,
  isPending,
  singular,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AttributeResponse | null;
  isEdit: boolean;
  isPending: boolean;
  singular: string;
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<AttributeFormValues>({
    resolver: zodResolver(attributeFormSchema),
    defaultValues: { name: "", dataType: "TEXT", isActive: true },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name ?? "",
        dataType: item?.dataType ?? "TEXT",
        isActive: item?.isActive ?? true,
      });
    }
  }, [open, item, form]);

  const handleSubmit = async (values: AttributeFormValues) => {
    const payload = {
      name: values.name.trim(),
      dataType: values.dataType,
      isActive: values.isActive,
    };
    if (isEdit && item) {
      await onUpdate(item.id, payload);
      return;
    }
    await onCreate(payload);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${singular}` : `New ${singular}`}
      size="sm"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <TextField control={form.control} name="name" label="Name" />
        <SelectField
          control={form.control}
          name="dataType"
          label="Data type"
          options={ATTRIBUTE_DATA_TYPES.map((type) => ({
            value: type,
            label: type.charAt(0) + type.slice(1).toLowerCase(),
          }))}
        />
        <CheckboxField control={form.control} name="isActive" label="Active" />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create"}
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}

function TagDialog({
  open,
  onOpenChange,
  item,
  isEdit,
  isPending,
  singular,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TagResponse | null;
  isEdit: boolean;
  isPending: boolean;
  singular: string;
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { name: "", color: "", isActive: true },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name ?? "",
        color: item?.color ?? "",
        isActive: item?.isActive ?? true,
      });
    }
  }, [open, item, form]);

  const handleSubmit = async (values: TagFormValues) => {
    const payload = {
      name: values.name.trim(),
      color: normalizeOptional(values.color)?.toUpperCase() ?? null,
      isActive: values.isActive,
    };
    if (isEdit && item) {
      await onUpdate(item.id, payload);
      return;
    }
    await onCreate(payload);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${singular}` : `New ${singular}`}
      size="sm"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <TextField control={form.control} name="name" label="Name" />
        <TextField
          control={form.control}
          name="color"
          label="Color"
          placeholder="#AABBCC"
          description="Optional hex color"
        />
        <CheckboxField control={form.control} name="isActive" label="Active" />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create"}
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
