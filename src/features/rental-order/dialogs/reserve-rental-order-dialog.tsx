"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { NumberField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { getRemainingReserveQuantity } from "../mappers";
import { reserveRentalOrderFormSchema, type ReserveRentalOrderFormValues } from "../schemas";
import { useRentalOrderFilterOptions, useReserveRentalOrder } from "../hooks";
import type { RentalOrderResponse } from "../types";

type ReserveRentalOrderDialogProps = {
  order: RentalOrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReserveRentalOrderDialog({
  order,
  open,
  onOpenChange,
}: ReserveRentalOrderDialogProps) {
  const reserveMutation = useReserveRentalOrder();
  const { productLabelById } = useRentalOrderFilterOptions();

  const defaultValues: ReserveRentalOrderFormValues | undefined = order
    ? {
        items: order.items
          .map((item) => ({
            productId: item.productId,
            quantity: getRemainingReserveQuantity(item),
            maxQuantity: getRemainingReserveQuantity(item),
          }))
          .filter((item) => item.maxQuantity > 0),
      }
    : undefined;

  const form = useForm<ReserveRentalOrderFormValues>({
    resolver: zodResolver(reserveRentalOrderFormSchema),
    values: defaultValues,
  });

  if (!order || !defaultValues || defaultValues.items.length === 0) {
    return null;
  }

  const handleSubmit = async (values: ReserveRentalOrderFormValues) => {
    const items = values.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

    if (items.length === 0) {
      return;
    }

    await reserveMutation.mutateAsync({ id: order.id, payload: { items } });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reserve inventory"
      description={`Reserve stock for "${order.orderNumber}".`}
      size="lg"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium" scope="col">Product</th>
                <th className="px-3 py-2 font-medium" scope="col">Remaining</th>
                <th className="px-3 py-2 font-medium" scope="col">Reserve now</th>
              </tr>
            </thead>
            <tbody>
              {defaultValues.items.map((item, index) => (
                <tr key={item.productId} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    {productLabelById.get(item.productId) ?? item.productId}
                  </td>
                  <td className="px-3 py-2">{item.maxQuantity}</td>
                  <td className="px-3 py-2">
                    <NumberField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      label="Quantity to reserve"
                      min={0}
                      max={item.maxQuantity}
                      step={1}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={reserveMutation.isPending}>
            Reserve inventory
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
