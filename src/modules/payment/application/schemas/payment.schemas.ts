import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/modules/payment/domain/payment.constants";

const PositiveAmountSchema = z.coerce.number().positive();

export const PaymentIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreatePaymentSchema = z.object({
  paymentNumber: NonEmptyStringSchema.max(50),
  rentalInvoiceId: UUIDSchema,
  customerId: UUIDSchema,
  paymentDate: DateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  amount: PositiveAmountSchema,
  referenceNumber: TrimmedStringSchema.max(100).optional().nullable(),
  notes: TrimmedStringSchema.max(500).optional().nullable(),
});

export const UpdatePaymentSchema = z
  .object({
    paymentDate: DateSchema.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    amount: PositiveAmountSchema.optional(),
    referenceNumber: TrimmedStringSchema.max(100).optional().nullable(),
    notes: TrimmedStringSchema.max(500).optional().nullable(),
  })
  .refine(
    (value) =>
      value.paymentDate !== undefined ||
      value.paymentMethod !== undefined ||
      value.amount !== undefined ||
      value.referenceNumber !== undefined ||
      value.notes !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;
export type PaymentIdParamInput = z.infer<typeof PaymentIdParamSchema>;

export const PaymentStatusFilterSchema = z.enum(PAYMENT_STATUSES);
