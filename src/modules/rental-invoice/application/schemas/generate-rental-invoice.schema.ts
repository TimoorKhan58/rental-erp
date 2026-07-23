import { z } from "zod";

import { UUIDSchema } from "@/shared/application/validation";

const OptionalChargeAmountSchema = z.coerce
  .number()
  .nonnegative("Amount must be zero or greater")
  .max(99_999_999.99)
  .optional()
  .default(0);

const ConditionChargeOverrideSchema = z.object({
  rentalOrderItemId: UUIDSchema,
  damageUnitPrice: z.coerce
    .number()
    .nonnegative("Damage unit price must be zero or greater")
    .max(99_999_999.99)
    .optional(),
  lossUnitPrice: z.coerce
    .number()
    .nonnegative("Loss unit price must be zero or greater")
    .max(99_999_999.99)
    .optional(),
});

export const GenerateRentalInvoiceFromOrderSchema = z.object({
  rentalOrderId: UUIDSchema,
  deliveryCharges: OptionalChargeAmountSchema,
  labourCharges: OptionalChargeAmountSchema,
  taxAmount: OptionalChargeAmountSchema,
  conditionChargeOverrides: z.array(ConditionChargeOverrideSchema).optional().default([]),
});

export type GenerateRentalInvoiceFromOrderInput = z.input<
  typeof GenerateRentalInvoiceFromOrderSchema
>;
