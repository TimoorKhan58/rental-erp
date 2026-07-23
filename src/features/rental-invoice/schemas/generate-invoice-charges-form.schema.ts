import { z } from "zod";

const optionalAmount = z
  .number({ message: "Enter a valid amount" })
  .nonnegative("Amount must be zero or greater")
  .max(99_999_999.99, "Amount is too large");

const conditionChargeOverrideSchema = z.object({
  rentalOrderItemId: z.string().uuid(),
  productName: z.string(),
  damagedQuantity: z.number().int().nonnegative(),
  lostQuantity: z.number().int().nonnegative(),
  missingQuantity: z.number().int().nonnegative(),
  damageUnitPrice: optionalAmount,
  lossUnitPrice: optionalAmount,
  actualPrice: optionalAmount.nullable(),
});

export const generateInvoiceChargesFormSchema = z.object({
  deliveryCharges: optionalAmount,
  labourCharges: optionalAmount,
  taxAmount: optionalAmount,
  conditionCharges: z.array(conditionChargeOverrideSchema),
});

export type GenerateInvoiceChargesFormValues = z.infer<
  typeof generateInvoiceChargesFormSchema
>;

export type ConditionChargeFormRow = z.infer<typeof conditionChargeOverrideSchema>;

export const DEFAULT_GENERATE_INVOICE_CHARGES: GenerateInvoiceChargesFormValues = {
  deliveryCharges: 0,
  labourCharges: 0,
  taxAmount: 0,
  conditionCharges: [],
};
