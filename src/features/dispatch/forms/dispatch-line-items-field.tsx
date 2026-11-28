"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { CheckCheckIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { StepperField, TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { cn } from "@/lib/utils";
import type { CreateDispatchFormValues } from "../schemas";

type DispatchLineItemsFieldProps = {
  productLabelById: Map<string, string>;
  readOnly?: boolean;
};

/** One tap adds 10 when there are many to count (chairs), else 1. */
export function stepFor(maxQuantity: number | undefined): number {
  return maxQuantity !== undefined && maxQuantity >= 100 ? 10 : 1;
}

/**
 * What goes on the truck, one card per item (UI redesign, phone screens):
 * big − / + buttons, "of N ready", and one button to load everything ready.
 * Works the same on a desktop, where the cards sit in a row.
 */
export function DispatchLineItemsField({
  productLabelById,
  readOnly = false,
}: DispatchLineItemsFieldProps) {
  const form = useFormContext<CreateDispatchFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const canFillAll = !readOnly && (items ?? []).some((line) => line?.maxQuantity !== undefined);

  const fillAll = () => {
    (items ?? []).forEach((line, index) => {
      if (line?.maxQuantity !== undefined) {
        form.setValue(`items.${index}.quantity`, line.maxQuantity, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    });
  };

  return (
    <div className="space-y-3">
      {canFillAll ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Count what goes on the truck.</p>
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<CheckCheckIcon className="size-4" aria-hidden="true" />}
            onClick={fillAll}
          >
            Load everything ready
          </AppButton>
        </div>
      ) : null}

      <ul className="space-y-2.5">
        {fields.map((field, index) => {
          const line = items?.[index];
          const name = productLabelById.get(line?.productId ?? "") ?? line?.productId ?? "—";
          const max = line?.maxQuantity;
          const short = max !== undefined && (line?.quantity ?? 0) < max;

          return (
            <li
              key={field.id}
              className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)_auto] md:items-start"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{name}</p>
                {max !== undefined ? (
                  <p className={cn("text-sm", short ? "text-warning-foreground" : "text-muted-foreground")}>
                    {short ? `${max - (line?.quantity ?? 0)} fewer than the ${max} ready` : `All ${max} ready`}
                  </p>
                ) : null}
              </div>

              {readOnly ? (
                <p className="text-base font-semibold tabular-nums">{line?.quantity ?? "—"}</p>
              ) : (
                <StepperField
                  className="[&>label]:sr-only"
                  control={form.control}
                  name={`items.${index}.quantity`}
                  label={`How many ${name}`}
                  min={1}
                  max={max}
                  step={stepFor(max)}
                />
              )}

              {readOnly ? (
                <p className="text-sm text-muted-foreground">{line?.notes || "—"}</p>
              ) : (
                <TextField
                  className="[&_label]:sr-only"
                  control={form.control}
                  name={`items.${index}.notes`}
                  label={`Note for ${name}`}
                />
              )}

              {!readOnly ? (
                <AppButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="justify-self-end"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  aria-label={`Leave out ${name}`}
                >
                  <Trash2Icon className="size-4" />
                </AppButton>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!readOnly ? (
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
          onClick={() =>
            append({
              productId: "",
              rentalOrderItemId: "",
              quantity: 1,
              notes: "",
            })
          }
        >
          Add line item
        </AppButton>
      ) : null}
    </div>
  );
}
