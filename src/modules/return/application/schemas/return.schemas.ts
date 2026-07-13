import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

const ReturnItemInputSchema = z.object({
  rentalOrderItemId: UUIDSchema,
  dispatchItemId: UUIDSchema.optional().nullable(),
  quantity: PositiveIntSchema,
  notes: TrimmedStringSchema.max(500).optional().nullable(),
});

export const ReturnIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateReturnSchema = z.object({
  returnNumber: NonEmptyStringSchema.max(50),
  rentalOrderId: UUIDSchema,
  dispatchId: UUIDSchema,
  returnDate: DateSchema,
  remarks: TrimmedStringSchema.max(500).optional().nullable(),
  items: z.array(ReturnItemInputSchema).min(1),
});

export const UpdateReturnSchema = z
  .object({
    returnDate: DateSchema.optional(),
    remarks: TrimmedStringSchema.max(500).optional().nullable(),
    items: z.array(ReturnItemInputSchema).min(1).optional(),
  })
  .refine(
    (value) =>
      value.returnDate !== undefined ||
      value.remarks !== undefined ||
      value.items !== undefined,
    { message: "At least one field must be provided for update" },
  );

export const InspectReturnSchema = z.object({
  items: z
    .array(
      z.object({
        rentalOrderItemId: UUIDSchema,
        goodQuantity: z.coerce.number().int().min(0),
        damagedQuantity: z.coerce.number().int().min(0),
        lostQuantity: z.coerce.number().int().min(0),
        notes: TrimmedStringSchema.max(500).optional().nullable(),
      }),
    )
    .min(1),
});

export const RecoverLostReturnSchema = z.object({
  items: z
    .array(
      z.object({
        rentalOrderItemId: UUIDSchema,
        quantity: PositiveIntSchema,
      }),
    )
    .min(1),
  refund: z
    .object({
      rentalInvoiceId: UUIDSchema,
      amount: z.coerce.number().positive(),
      paymentNumber: NonEmptyStringSchema.max(50),
      paymentMethod: z
        .enum([
          "CASH",
          "BANK_TRANSFER",
          "CHEQUE",
          "CARD",
          "ONLINE",
          "OTHER",
        ])
        .optional()
        .default("CASH"),
      paymentDate: DateSchema.optional(),
      referenceNumber: TrimmedStringSchema.max(100).optional().nullable(),
      notes: TrimmedStringSchema.max(500).optional().nullable(),
    })
    .optional(),
});

export type CreateReturnInput = z.infer<typeof CreateReturnSchema>;
export type UpdateReturnInput = z.infer<typeof UpdateReturnSchema>;
export type InspectReturnInput = z.infer<typeof InspectReturnSchema>;
export type RecoverLostReturnInput = z.infer<typeof RecoverLostReturnSchema>;
export type ReturnIdParamInput = z.infer<typeof ReturnIdParamSchema>;
