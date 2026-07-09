import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  OptionalDateSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { PURCHASE_ORDER_STATUSES } from "@/modules/procurement/domain/purchase-order.constants";

const NonNegativeNumberSchema = z.coerce.number().nonnegative();

const PurchaseOrderItemInputSchema = z.object({
  productId: UUIDSchema,
  quantity: PositiveIntSchema,
  unitCost: NonNegativeNumberSchema,
});

export const PurchaseOrderIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreatePurchaseOrderSchema = z.object({
  poNumber: NonEmptyStringSchema.max(50),
  supplierId: UUIDSchema,
  warehouseId: UUIDSchema,
  orderDate: DateSchema,
  expectedDate: OptionalDateSchema.nullable().optional(),
  remarks: TrimmedStringSchema.max(500).optional().nullable(),
  items: z.array(PurchaseOrderItemInputSchema).min(1),
});

export const UpdatePurchaseOrderSchema = z
  .object({
    supplierId: UUIDSchema.optional(),
    warehouseId: UUIDSchema.optional(),
    orderDate: DateSchema.optional(),
    expectedDate: OptionalDateSchema.nullable().optional(),
    remarks: TrimmedStringSchema.max(500).optional().nullable(),
    items: z.array(PurchaseOrderItemInputSchema).min(1).optional(),
  })
  .refine(
    (value) =>
      value.supplierId !== undefined ||
      value.warehouseId !== undefined ||
      value.orderDate !== undefined ||
      value.expectedDate !== undefined ||
      value.remarks !== undefined ||
      value.items !== undefined,
    { message: "At least one field must be provided for update" },
  );

export const ReceivePurchaseOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: UUIDSchema,
        quantity: PositiveIntSchema,
      }),
    )
    .min(1),
});

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof ReceivePurchaseOrderSchema>;
export type PurchaseOrderIdParamInput = z.infer<
  typeof PurchaseOrderIdParamSchema
>;

export const PurchaseOrderStatusFilterSchema = z.enum(PURCHASE_ORDER_STATUSES);
