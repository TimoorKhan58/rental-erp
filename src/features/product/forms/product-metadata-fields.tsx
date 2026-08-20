"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  CheckboxField,
  MultiSelectField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { Input } from "@/components/ui/input";
import type {
  CreateProductFormValues,
  UpdateProductFormValues,
} from "../schemas";

type ProductFormValues = CreateProductFormValues | UpdateProductFormValues;

type ProductMetadataFieldsProps = {
  tagOptions: Array<{ value: string; label: string }>;
  attributeOptions: Array<{ id: string; name: string }>;
};

const emptyImage = {
  url: "",
  altText: "",
  isPrimary: false,
};

const emptySpecification = {
  key: "",
  value: "",
};

export function ProductMetadataFields({
  tagOptions,
  attributeOptions,
}: ProductMetadataFieldsProps) {
  const form = useFormContext<ProductFormValues>();

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({
    control: form.control,
    name: "images",
  });

  const {
    fields: specificationFields,
    append: appendSpecification,
    remove: removeSpecification,
  } = useFieldArray({
    control: form.control,
    name: "specifications",
  });

  return (
    <>
      <SectionCard title="Tags">
        <MultiSelectField
          control={form.control}
          name="tagIds"
          label="Product tags"
          description="Optional tags from the catalog."
          options={tagOptions}
        />
      </SectionCard>

      <SectionCard title="Specifications">
        <div className="space-y-3">
          {specificationFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No specifications added yet.</p>
          ) : (
            specificationFields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto]">
                <TextField
                  control={form.control}
                  name={`specifications.${index}.key`}
                  label="Key"
                  placeholder="e.g. Weight"
                />
                <TextField
                  control={form.control}
                  name={`specifications.${index}.value`}
                  label="Value"
                  placeholder="e.g. 12 kg"
                />
                <div className="flex items-end">
                  <AppButton
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remove specification"
                    onClick={() => removeSpecification(index)}
                  >
                    <Trash2Icon className="size-4" aria-hidden="true" />
                  </AppButton>
                </div>
              </div>
            ))
          )}
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
            onClick={() => appendSpecification(emptySpecification)}
          >
            Add specification
          </AppButton>
        </div>
      </SectionCard>

      <SectionCard title="Images">
        <div className="space-y-3">
          {imageFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images added yet.</p>
          ) : (
            imageFields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-lg border p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    control={form.control}
                    name={`images.${index}.url`}
                    label="Image URL"
                    placeholder="https://..."
                  />
                  <TextField
                    control={form.control}
                    name={`images.${index}.altText`}
                    label="Alt text"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <CheckboxField
                    control={form.control}
                    name={`images.${index}.isPrimary`}
                    label="Primary image"
                  />
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Trash2Icon className="size-4" aria-hidden="true" />}
                    onClick={() => removeImage(index)}
                  >
                    Remove
                  </AppButton>
                </div>
              </div>
            ))
          )}
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
            onClick={() => appendImage(emptyImage)}
          >
            Add image
          </AppButton>
        </div>
      </SectionCard>

      {attributeOptions.length > 0 ? (
        <SectionCard title="Attributes">
          <div className="grid gap-4 md:grid-cols-2">
            {attributeOptions.map((attribute) => (
              <ProductAttributeValueField
                key={attribute.id}
                attributeId={attribute.id}
                label={attribute.name}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}

function ProductAttributeValueField({
  attributeId,
  label,
}: {
  attributeId: string;
  label: string;
}) {
  const form = useFormContext<ProductFormValues>();
  const attributeValues = form.watch("attributeValues") ?? [];
  const currentValue =
    attributeValues.find((entry) => entry.attributeId === attributeId)?.value ?? "";

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor={`attribute-${attributeId}`}>
        {label}
      </label>
      <Input
        id={`attribute-${attributeId}`}
        value={currentValue}
        placeholder={`Enter ${label.toLowerCase()}`}
        onChange={(event) => {
          const nextValue = event.target.value;
          const current = form.getValues("attributeValues") ?? [];
          const filtered = current.filter((entry) => entry.attributeId !== attributeId);

          form.setValue(
            "attributeValues",
            nextValue.trim()
              ? [...filtered, { attributeId, value: nextValue }]
              : filtered,
            { shouldDirty: true },
          );
        }}
      />
    </div>
  );
}
