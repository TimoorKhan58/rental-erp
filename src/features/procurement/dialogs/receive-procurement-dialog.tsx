"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { NumberField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { formatCurrency } from "@/lib/utils";
import { getRemainingQuantity } from "../mappers";
import { receiveProcurementFormSchema, type ReceiveProcurementFormValues } from "../schemas";
import { useProcurementFilterOptions, useReceiveProcurement } from "../hooks";
import type { ProcurementResponse } from "../types";

type ReceiveProcurementDialogProps = {
  procurement: ProcurementResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReceiveProcurementDialog({
  procurement,
  open,
  onOpenChange,
}: ReceiveProcurementDialogProps) {
  const receiveMutation = useReceiveProcurement();
  const { productLabelById } = useProcurementFilterOptions();

  const defaultValues: ReceiveProcurementFormValues | undefined = procurement
    ? {
        items: procurement.items
          .map((item) => ({
            productId: item.productId,
            quantity: getRemainingQuantity(item),
            maxQuantity: getRemainingQuantity(item),
          }))
          .filter((item) => item.maxQuantity > 0),
      }
    : undefined;

  const form = useForm<ReceiveProcurementFormValues>({
    resolver: zodResolver(receiveProcurementFormSchema),
    values: defaultValues,
  });

  if (!procurement || !defaultValues || defaultValues.items.length === 0) {
    return null;
  }

  const handleSubmit = async (values: ReceiveProcurementFormValues) => {
    const items = values.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

    if (items.length === 0) {
      return;
    }

    await receiveMutation.mutateAsync({ id: procurement.id, payload: { items } });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Receive goods"
      description={`Record received quantities for "${procurement.poNumber}".`}
      size="lg"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium" scope="col">
                  Product
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Remaining
                </th>
                <th className="px-3 py-2 font-medium" scope="col">
                  Receive now
                </th>
                <th className="px-3 py-2 font-medium text-right" scope="col">
                  Unit cost
                </th>
              </tr>
            </thead>
            <tbody>
              {defaultValues.items.map((item, index) => {
                const sourceItem = procurement.items.find(
                  (line) => line.productId === item.productId,
                );

                return (
                  <tr key={item.productId} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      {productLabelById.get(item.productId) ?? item.productId}
                    </td>
                    <td className="px-3 py-2">{item.maxQuantity}</td>
                    <td className="px-3 py-2">
                      <NumberField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        label="Quantity to receive"
                        min={0}
                        max={item.maxQuantity}
                        step={1}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {sourceItem ? formatCurrency(sourceItem.unitCost) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={receiveMutation.isPending}>
            Receive goods
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
