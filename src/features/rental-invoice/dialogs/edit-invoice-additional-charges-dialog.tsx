"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { CurrencyField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  DEFAULT_GENERATE_INVOICE_CHARGES,
  generateInvoiceChargesFormSchema,
  type GenerateInvoiceChargesFormValues,
} from "../schemas/generate-invoice-charges-form.schema";
import { useUpdateRentalInvoiceAdditionalCharges } from "../hooks";
import type { RentalInvoiceResponse } from "../types";

type EditInvoiceAdditionalChargesDialogProps = {
  invoice: RentalInvoiceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function extractChargeAmounts(
  invoice: RentalInvoiceResponse,
): GenerateInvoiceChargesFormValues {
  const sumByType = (lineType: string) =>
    invoice.items
      .filter((item) => item.lineType === lineType)
      .reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    deliveryCharges: sumByType("DELIVERY_CHARGE"),
    labourCharges: sumByType("LABOUR_CHARGE"),
    taxAmount: sumByType("TAX"),
    conditionCharges: [],
  };
}

export function EditInvoiceAdditionalChargesDialog({
  invoice,
  open,
  onOpenChange,
}: EditInvoiceAdditionalChargesDialogProps) {
  const updateCharges = useUpdateRentalInvoiceAdditionalCharges();

  const defaults = useMemo(
    () =>
      invoice ? extractChargeAmounts(invoice) : DEFAULT_GENERATE_INVOICE_CHARGES,
    [invoice],
  );

  const form = useForm<GenerateInvoiceChargesFormValues>({
    resolver: zodResolver(generateInvoiceChargesFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open && invoice) {
      form.reset(extractChargeAmounts(invoice));
    }
  }, [open, invoice, form]);

  if (!invoice) {
    return null;
  }

  const handleSubmit = async (values: GenerateInvoiceChargesFormValues) => {
    await updateCharges.mutateAsync({
      id: invoice.id,
      invoice,
      charges: values,
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Additional charges"
      description="Update optional tax, labour, and delivery amounts on this draft invoice."
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <CurrencyField
          control={form.control}
          name="deliveryCharges"
          label="Delivery charges"
        />
        <CurrencyField
          control={form.control}
          name="labourCharges"
          label="Labour charge"
        />
        <CurrencyField
          control={form.control}
          name="taxAmount"
          label="Tax"
        />

        <div className="flex justify-end gap-2 pt-2">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" loading={updateCharges.isPending}>
            Save charges
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
