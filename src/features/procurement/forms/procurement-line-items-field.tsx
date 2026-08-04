"use client";

import { useState } from "react";
import { useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { NumberField, SelectField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { AppModal } from "@/components/design-system/modal";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { calculateLineSubtotal, calculateOrderTotal } from "../mappers";
import { useCreateProcurementProduct, useProcurementPermissions } from "../hooks";
import type { CreateProcurementFormValues } from "../schemas";

type ProcurementLineItemsFieldProps = {
  productOptions: Array<{ id: string; label: string }>;
  readOnly?: boolean;
};

const emptyLineItem = {
  productId: "",
  quantity: 1,
  unitCost: 0,
};

export function ProcurementLineItemsField({
  productOptions,
  readOnly = false,
}: ProcurementLineItemsFieldProps) {
  const { canCreateProduct } = useProcurementPermissions();
  const createProduct = useCreateProcurementProduct();
  const form = useFormContext<CreateProcurementFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const [openCreateProduct, setOpenCreateProduct] = useState(false);
  const [productName, setProductName] = useState("");
  const [productUnit, setProductUnit] = useState("piece");
  const [productRate, setProductRate] = useState("0");

  const items = form.watch("items");
  const orderTotal = useMemo(() => calculateOrderTotal(items ?? []), [items]);

  const selectOptions = productOptions.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  const handleCreateProduct = async () => {
    const normalizedName = productName.trim();
    const normalizedUnit = productUnit.trim();
    const parsedRate = Number(productRate);

    if (!normalizedName || !normalizedUnit || !Number.isFinite(parsedRate) || parsedRate <= 0) {
      return;
    }

    const created = await createProduct.mutateAsync({
      name: normalizedName,
      unit: normalizedUnit,
      rentalRate: parsedRate,
      description: null,
      isActive: true,
    });

    append({
      productId: created.id,
      quantity: 1,
      unitCost: 0,
    });

    setOpenCreateProduct(false);
    setProductName("");
    setProductUnit("piece");
    setProductRate("0");
  };

  return (
    <div className="space-y-4">
      {!readOnly && canCreateProduct ? (
        <div className="flex justify-end">
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpenCreateProduct(true)}
          >
            Add new product
          </AppButton>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium" scope="col">
                Product
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Quantity
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Unit cost
              </th>
              <th className="px-3 py-2 font-medium text-right" scope="col">
                Subtotal
              </th>
              {!readOnly ? (
                <th className="px-3 py-2 font-medium" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const line = items?.[index];
              const subtotal = line ? calculateLineSubtotal(line) : 0;

              return (
                <tr key={field.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span>
                        {selectOptions.find((option) => option.value === line?.productId)?.label ??
                          line?.productId ??
                          "—"}
                      </span>
                    ) : (
                      <SelectField
                        control={form.control}
                        name={`items.${index}.productId`}
                        label="Product"
                        placeholder="Select product"
                        options={selectOptions}
                        className="min-w-48"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span>{line?.quantity ?? "—"}</span>
                    ) : (
                      <NumberField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        label="Quantity"
                        min={1}
                        step={1}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span>{line ? formatCurrency(line.unitCost) : "—"}</span>
                    ) : (
                      <NumberField
                        control={form.control}
                        name={`items.${index}.unitCost`}
                        label="Unit cost"
                        min={0}
                        step={0.01}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right align-top font-medium">
                    {formatCurrency(subtotal)}
                  </td>
                  {!readOnly ? (
                    <td className="px-3 py-2 align-top">
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        aria-label={`Remove line item ${index + 1}`}
                      >
                        <Trash2Icon className="size-4" />
                      </AppButton>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/20">
              <td
                colSpan={readOnly ? 3 : 4}
                className="px-3 py-2 text-right font-medium"
              >
                Order total
              </td>
              <td className="px-3 py-2 text-right font-semibold">
                {formatCurrency(orderTotal)}
              </td>
              {!readOnly ? <td /> : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly ? (
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
          onClick={() => append(emptyLineItem)}
        >
          Add line item
        </AppButton>
      ) : null}

      <AppModal
        open={openCreateProduct}
        onOpenChange={(open) => {
          setOpenCreateProduct(open);
          if (!open) {
            setProductName("");
            setProductUnit("piece");
            setProductRate("0");
          }
        }}
        title="New product"
        description="Create a product and add it as a line item."
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="po-new-product-name">
              Product name
            </label>
            <Input
              id="po-new-product-name"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Enter product name"
              disabled={createProduct.isPending}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="po-new-product-unit">
                Unit
              </label>
              <Input
                id="po-new-product-unit"
                value={productUnit}
                onChange={(event) => setProductUnit(event.target.value)}
                placeholder="piece"
                disabled={createProduct.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="po-new-product-rate">
                Rental rate
              </label>
              <Input
                id="po-new-product-rate"
                type="number"
                min="0.01"
                step="0.01"
                value={productRate}
                onChange={(event) => setProductRate(event.target.value)}
                placeholder="0.00"
                disabled={createProduct.isPending}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <AppButton
              type="button"
              variant="outline"
              onClick={() => setOpenCreateProduct(false)}
              disabled={createProduct.isPending}
            >
              Cancel
            </AppButton>
            <AppButton type="button" onClick={() => void handleCreateProduct()} loading={createProduct.isPending}>
              Create product
            </AppButton>
          </div>
        </div>
      </AppModal>
    </div>
  );
}
