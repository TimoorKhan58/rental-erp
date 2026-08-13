import { z } from "zod";

import {
  DateSchema,
  PositiveIntSchema,
  PositiveNumberSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { EXTERNAL_RENTAL_AGREEMENT_STATUSES } from "@/modules/external-rental/domain";

const NonNegativeNumberSchema = z.coerce.number().nonnegative();

const ExternalRentalItemInputSchema = z.object({
  productId: UUIDSchema,
  rentalOrderItemId: UUIDSchema,
  quantityRequested: PositiveIntSchema,
  unitCost: NonNegativeNumberSchema,
  notes: TrimmedStringSchema.max(500).optional().nullable(),
});

export const ExternalRentalIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateExternalRentalSchema = z
  .object({
    agreementNumber: TrimmedStringSchema.max(50).optional(),
    supplierId: UUIDSchema,
    warehouseId: UUIDSchema,
    rentalOrderId: UUIDSchema,
    hireStartDate: DateSchema,
    hireEndDate: DateSchema,
    expectedReturnToSupplierDate: DateSchema,
    remarks: TrimmedStringSchema.max(500).optional().nullable(),
    items: z.array(ExternalRentalItemInputSchema).min(1),
  })
  .strict();

export const ConfirmExternalRentalSchema = z
  .object({
    items: z
      .array(
        z.object({
          rentalOrderItemId: UUIDSchema,
          quantityConfirmed: PositiveIntSchema,
        }),
      )
      .min(1)
      .optional(),
  })
  .strict();

export const ReceiveExternalRentalSchema = z
  .object({
    items: z
      .array(
        z.object({
          rentalOrderItemId: UUIDSchema,
          quantity: PositiveIntSchema,
        }),
      )
      .min(1),
  })
  .strict();

export const AllocateExternalRentalSchema = z
  .object({
    items: z
      .array(
        z.object({
          rentalOrderItemId: UUIDSchema,
          quantity: PositiveIntSchema,
        }),
      )
      .min(1),
  })
  .strict();

export const SupplierReturnExternalRentalSchema = z
  .object({
    items: z
      .array(
        z.object({
          rentalOrderItemId: UUIDSchema,
          quantity: PositiveIntSchema,
        }),
      )
      .min(1),
  })
  .strict();

export const WriteOffExternalRentalSchema = z
  .object({
    items: z
      .array(
        z.object({
          rentalOrderItemId: UUIDSchema,
          quantity: PositiveIntSchema,
        }),
      )
      .min(1),
  })
  .strict();

export const SettleExternalRentalSchema = z
  .object({
    paymentAmount: PositiveNumberSchema,
  })
  .strict();

export const ExternalRentalStatusFilterSchema = z.enum(
  EXTERNAL_RENTAL_AGREEMENT_STATUSES,
);

export type ExternalRentalIdParamInput = z.infer<
  typeof ExternalRentalIdParamSchema
>;
export type CreateExternalRentalInput = z.infer<
  typeof CreateExternalRentalSchema
>;
export type ConfirmExternalRentalInput = z.infer<
  typeof ConfirmExternalRentalSchema
>;
export type ReceiveExternalRentalInput = z.infer<
  typeof ReceiveExternalRentalSchema
>;
export type AllocateExternalRentalInput = z.infer<
  typeof AllocateExternalRentalSchema
>;
export type SupplierReturnExternalRentalInput = z.infer<
  typeof SupplierReturnExternalRentalSchema
>;
export type WriteOffExternalRentalInput = z.infer<
  typeof WriteOffExternalRentalSchema
>;
export type SettleExternalRentalInput = z.infer<
  typeof SettleExternalRentalSchema
>;
