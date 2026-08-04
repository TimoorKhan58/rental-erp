import { z } from "zod";

import {
  DateSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/modules/supplier-payment/domain/supplier-payment.constants";

const PositiveAmountSchema = z.coerce.number().positive();

export const SupplierPaymentIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateSupplierPaymentSchema = z.object({
  paymentNumber: TrimmedStringSchema.max(50).optional(),
  purchaseOrderId: UUIDSchema,
  supplierId: UUIDSchema,
  paymentDate: DateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  amount: PositiveAmountSchema,
  referenceNumber: TrimmedStringSchema.max(100).optional().nullable(),
  notes: TrimmedStringSchema.max(500).optional().nullable(),
});

export type CreateSupplierPaymentInput = z.infer<
  typeof CreateSupplierPaymentSchema
>;
export type SupplierPaymentIdParamInput = z.infer<
  typeof SupplierPaymentIdParamSchema
>;

export const SupplierPaymentStatusFilterSchema = z.enum(PAYMENT_STATUSES);
