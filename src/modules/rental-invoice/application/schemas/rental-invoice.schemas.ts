import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  OptionalDateSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  RENTAL_INVOICE_LINE_TYPES,
  RENTAL_INVOICE_STATUSES,
} from "@/modules/rental-invoice/domain/rental-invoice.constants";

const NonNegativeNumberSchema = z.coerce.number().nonnegative();

const RentalInvoiceItemInputSchema = z.object({
  lineType: z.enum(RENTAL_INVOICE_LINE_TYPES),
  description: NonEmptyStringSchema.max(500),
  quantity: PositiveIntSchema,
  unitPrice: NonNegativeNumberSchema,
  sortOrder: z.coerce.number().int().nonnegative().optional(),
  productName: TrimmedStringSchema.max(200).optional().nullable(),
  dailyRate: NonNegativeNumberSchema.optional().nullable(),
  numberOfDays: z.coerce.number().int().positive().optional().nullable(),
  damagedQuantity: z.coerce.number().int().nonnegative().optional(),
  lostQuantity: z.coerce.number().int().nonnegative().optional(),
  missingQuantity: z.coerce.number().int().nonnegative().optional(),
  notes: TrimmedStringSchema.max(500).optional().nullable(),
  lineTotal: NonNegativeNumberSchema.optional(),
});

export const RentalInvoiceIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateRentalInvoiceSchema = z.object({
  invoiceNumber: NonEmptyStringSchema.max(50),
  rentalOrderId: UUIDSchema,
  customerId: UUIDSchema,
  invoiceDate: DateSchema,
  dueDate: OptionalDateSchema.nullable().optional(),
  notes: TrimmedStringSchema.max(500).optional().nullable(),
  items: z.array(RentalInvoiceItemInputSchema).min(1),
});

export const UpdateRentalInvoiceSchema = z
  .object({
    invoiceDate: DateSchema.optional(),
    dueDate: OptionalDateSchema.nullable().optional(),
    notes: TrimmedStringSchema.max(500).optional().nullable(),
    items: z.array(RentalInvoiceItemInputSchema).min(1).optional(),
  })
  .refine(
    (value) =>
      value.invoiceDate !== undefined ||
      value.dueDate !== undefined ||
      value.notes !== undefined ||
      value.items !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateRentalInvoiceInput = z.infer<typeof CreateRentalInvoiceSchema>;
export type UpdateRentalInvoiceInput = z.infer<typeof UpdateRentalInvoiceSchema>;
export type RentalInvoiceIdParamInput = z.infer<
  typeof RentalInvoiceIdParamSchema
>;

export const RentalInvoiceStatusFilterSchema = z.enum(RENTAL_INVOICE_STATUSES);
