"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { CheckCheckIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { StepperField, TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { cn } from "@/lib/utils";
import type { CreateReturnFormValues } from "../schemas";

type ReturnLineItemsFieldProps = {
  itemLabelById: Map<string, string>;
  readOnly?: boolean;
  allowAdd?: boolean;
};

/** One tap adds 10 when there are many to count (chairs), else 1. */
function stepFor(maxQuantity: number | undefined): number {
  return maxQuantity !== undefined && maxQuantity >= 100 ? 10 : 1;
}

/**
 * What came back, one card per item (UI redesign, phone screens): big − / +
 * buttons, "of N still out", and one button for "everything came back".
 * Checking for broken or missing items happens after, on the return page.
 */
export function ReturnLineItemsField({
  itemLabelById,
  readOnly = false,
  allowAdd = true,
}: ReturnLineItemsFieldProps) {
  const form = useFormContext<CreateReturnFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const items = form.watch("items");
  const canFillAll =
    !readOnly &&
    (items ?? []).some((line) => line?.maxQuantity !== undefined && !line?.requiresSourceSplit);

  const fillAll = () => {
    (items ?? []).forEach((line, index) => {
      if (line?.maxQuantity !== undefined && !line?.requiresSourceSplit) {
        form.setValue(`items.${index}.quantity`, line.maxQuantity, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    });
  };

  // Before a send-out is picked the form holds one empty line; show a hint
  // instead of a blank card.
  const waitingForSendOut = !(items ?? []).some((line) => line?.rentalOrderItemId);

  return (
    <div className="space-y-3">
      {fields.length === 0 || waitingForSendOut ? (
        <p className="text-sm text-muted-foreground">
          Pick the send-out above. Its items appear here so you can count what came back.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Count what came back. You check for broken or missing items on the next screen.
          </p>
          {canFillAll ? (
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<CheckCheckIcon className="size-4" aria-hidden="true" />}
              onClick={fillAll}
            >
              Everything came back
            </AppButton>
          ) : null}
        </div>
      )}

      <ul className="space-y-2.5" hidden={waitingForSendOut}>
        {fields.map((field, index) => {
          const line = items?.[index];
          const name =
            itemLabelById.get(line?.rentalOrderItemId ?? "") ?? (line?.rentalOrderItemId || "—");
          const max = line?.maxQuantity;
          const counted = line?.quantity ?? 0;
          const short = max !== undefined && counted < max;

          return (
            <li key={field.id} className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{name}</p>
                  {max !== undefined ? (
                    <p className={cn("text-sm", short ? "text-warning-foreground" : "text-muted-foreground")}>
                      {short ? `${max - counted} of ${max} still out` : `All ${max} back`}
                    </p>
                  ) : null}
                </div>

                <StepperField
                  className="[&>label]:sr-only"
                  control={form.control}
                  name={`items.${index}.quantity`}
                  label={`How many ${name} came back`}
                  min={1}
                  max={max}
                  step={stepFor(max)}
                  disabled={readOnly}
                />

                <TextField
                  className="[&_label]:sr-only"
                  control={form.control}
                  name={`items.${index}.notes`}
                  label={`Note for ${name}`}
                  disabled={readOnly}
                />

                {!readOnly && fields.length > 1 ? (
                  <AppButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="justify-self-end"
                    aria-label={`Leave out ${name}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2Icon className="size-4" aria-hidden="true" />
                  </AppButton>
                ) : null}
              </div>

              {line?.requiresSourceSplit ? (
                <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                  <StepperField
                    control={form.control}
                    name={`items.${index}.ownedQuantity`}
                    label="Your own"
                    min={0}
                    max={line.maxOwnedQuantity}
                    disabled={readOnly}
                    description={
                      line.maxOwnedQuantity !== undefined
                        ? `Up to ${line.maxOwnedQuantity} of yours still out`
                        : undefined
                    }
                  />
                  <StepperField
                    control={form.control}
                    name={`items.${index}.externalQuantity`}
                    label="Hired in"
                    min={0}
                    max={line.maxExternalQuantity}
                    disabled={readOnly}
                    description={
                      line.maxExternalQuantity !== undefined
                        ? `Up to ${line.maxExternalQuantity} hired-in still out`
                        : undefined
                    }
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!readOnly && allowAdd ? (
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
          onClick={() =>
            append({
              rentalOrderItemId: "",
              dispatchItemId: "",
              quantity: 1,
              notes: "",
            })
          }
        >
          Add item
        </AppButton>
      ) : null}
    </div>
  );
}
