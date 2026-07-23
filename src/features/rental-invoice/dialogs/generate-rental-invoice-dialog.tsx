"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { CurrencyField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { formatCurrency } from "@/lib/utils";
import { queryKeys } from "@/lib/query";
import { useRentalOrder } from "@/features/rental-order/hooks";
import { getReturns } from "@/features/return/services";
import { getProducts } from "@/features/product/services";
import {
  DEFAULT_GENERATE_INVOICE_CHARGES,
  generateInvoiceChargesFormSchema,
  type GenerateInvoiceChargesFormValues,
} from "../schemas/generate-invoice-charges-form.schema";
import { useGenerateRentalInvoiceFromOrder } from "../hooks";

type GenerateRentalInvoiceDialogProps = {
  rentalOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GenerateRentalInvoiceDialog({
  rentalOrderId,
  open,
  onOpenChange,
}: GenerateRentalInvoiceDialogProps) {
  const generateInvoice = useGenerateRentalInvoiceFromOrder();
  const orderQuery = useRentalOrder(open ? rentalOrderId : "");
  const returnsQuery = useQuery({
    queryKey: queryKeys.returns.list({
      rentalOrderId,
      pageSize: 100,
      status: "COMPLETED",
    }),
    queryFn: () =>
      getReturns({
        rentalOrderId,
        pageSize: 100,
        status: "COMPLETED",
      }),
    enabled: open && Boolean(rentalOrderId),
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ pageSize: 100, isActive: true }),
    queryFn: () => getProducts({ pageSize: 100, isActive: true }),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const conditionCharges = useMemo(() => {
    const order = orderQuery.data;
    if (!order) {
      return [];
    }

    const productNameById = new Map(
      (productsQuery.data?.items ?? []).map((product) => [product.id, product.name]),
    );
    const actualPriceById = new Map(
      (productsQuery.data?.items ?? []).map((product) => [
        product.id,
        product.replacementCost == null ? null : Number(product.replacementCost),
      ]),
    );

    const damagedByItem = new Map<string, number>();
    const lostByItem = new Map<string, number>();
    const missingByItem = new Map<string, number>();

    for (const returnRecord of returnsQuery.data?.items ?? []) {
      for (const item of returnRecord.items) {
        damagedByItem.set(
          item.rentalOrderItemId,
          (damagedByItem.get(item.rentalOrderItemId) ?? 0) + item.damagedQuantity,
        );
        lostByItem.set(
          item.rentalOrderItemId,
          (lostByItem.get(item.rentalOrderItemId) ?? 0) + item.lostQuantity,
        );
        missingByItem.set(
          item.rentalOrderItemId,
          (missingByItem.get(item.rentalOrderItemId) ?? 0) + (item.missingQuantity ?? 0),
        );
      }
    }

    return order.items
      .map((item) => {
        const damagedQuantity = damagedByItem.get(item.id) ?? 0;
        const lostQuantity = lostByItem.get(item.id) ?? 0;
        const missingQuantity = missingByItem.get(item.id) ?? 0;
        const actualPrice = actualPriceById.get(item.productId) ?? null;
        const defaultPrice = actualPrice ?? 0;

        return {
          rentalOrderItemId: item.id,
          productName: productNameById.get(item.productId) ?? item.productId,
          damagedQuantity,
          lostQuantity,
          missingQuantity,
          damageUnitPrice: defaultPrice,
          lossUnitPrice: defaultPrice,
          actualPrice,
        };
      })
      .filter(
        (item) =>
          item.damagedQuantity > 0 || item.lostQuantity > 0 || item.missingQuantity > 0,
      );
  }, [orderQuery.data, productsQuery.data, returnsQuery.data]);

  const form = useForm<GenerateInvoiceChargesFormValues>({
    resolver: zodResolver(generateInvoiceChargesFormSchema),
    defaultValues: DEFAULT_GENERATE_INVOICE_CHARGES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      ...DEFAULT_GENERATE_INVOICE_CHARGES,
      conditionCharges,
    });
  }, [open, conditionCharges, form]);

  const handleSubmit = async (values: GenerateInvoiceChargesFormValues) => {
    await generateInvoice.mutateAsync({
      rentalOrderId,
      deliveryCharges: values.deliveryCharges,
      labourCharges: values.labourCharges,
      taxAmount: values.taxAmount,
      conditionChargeOverrides: values.conditionCharges.map((item) => ({
        rentalOrderItemId: item.rentalOrderItemId,
        damageUnitPrice:
          item.damagedQuantity > 0 ? item.damageUnitPrice : undefined,
        lossUnitPrice: item.lostQuantity > 0 ? item.lossUnitPrice : undefined,
      })),
    });
    onOpenChange(false);
  };

  const isLoading =
    open &&
    (orderQuery.isLoading || returnsQuery.isLoading || productsQuery.isLoading);

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Generate customer invoice"
      description="Rental is billed separately. Damage and loss use actual product price by default — you can change the price here. Missing items are listed with no charge until converted to loss."
      size="lg"
    >
      {isLoading ? (
        <LoadingState label="Loading bill charges..." />
      ) : (
        <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
          {form.watch("conditionCharges").length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Damage / loss / missing</p>
              {form.watch("conditionCharges").map((item, index) => (
                <div
                  key={item.rentalOrderItemId}
                  className="space-y-3 rounded-lg border border-border/60 p-4"
                >
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Actual / replacement price:{" "}
                    {item.actualPrice == null
                      ? "Not set on product"
                      : formatCurrency(item.actualPrice)}
                  </p>

                  {item.damagedQuantity > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                      <p className="text-sm text-muted-foreground">
                        Damage ×{item.damagedQuantity} — charged on bill
                      </p>
                      <CurrencyField
                        control={form.control}
                        name={`conditionCharges.${index}.damageUnitPrice`}
                        label="Damage unit price"
                      />
                    </div>
                  ) : null}

                  {item.lostQuantity > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                      <p className="text-sm text-muted-foreground">
                        Loss ×{item.lostQuantity} — charged on bill
                      </p>
                      <CurrencyField
                        control={form.control}
                        name={`conditionCharges.${index}.lossUnitPrice`}
                        label="Loss unit price"
                      />
                    </div>
                  ) : null}

                  {item.missingQuantity > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Missing ×{item.missingQuantity} — no charge now. Customer must return
                      these. If not returned, convert to loss and charge actual price.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No damage, loss, or missing items on completed returns. Only rental and
              optional extras will be billed.
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Optional extras — leave at 0 to skip that line.
          </p>

          <CurrencyField
            control={form.control}
            name="deliveryCharges"
            label="Delivery charges (optional)"
          />
          <CurrencyField
            control={form.control}
            name="labourCharges"
            label="Labour charge (optional)"
          />
          <CurrencyField
            control={form.control}
            name="taxAmount"
            label="Tax (optional)"
          />

          <div className="flex justify-end gap-2 pt-2">
            <AppButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </AppButton>
            <AppButton type="submit" loading={generateInvoice.isPending}>
              Generate invoice
            </AppButton>
          </div>
        </AppForm>
      )}
    </AppModal>
  );
}
