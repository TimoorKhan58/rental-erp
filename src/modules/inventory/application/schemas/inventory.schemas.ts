import { z } from "zod";

import {
  NonNegativeIntSchema,
  UUIDSchema,
} from "@/shared/application/validation";

const OptionalMaximumStockSchema = z.preprocess((value) => {
  if (value === "") {
    return null;
  }

  return value;
}, NonNegativeIntSchema.nullable().optional());

export const InventoryIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateInventorySchema = z.object({
  productId: UUIDSchema,
  warehouseId: UUIDSchema,
  quantityOnHand: NonNegativeIntSchema,
  reservedQuantity: NonNegativeIntSchema.optional(),
  minimumStock: NonNegativeIntSchema.optional(),
  maximumStock: OptionalMaximumStockSchema,
  isActive: z.boolean().optional(),
});

export const UpdateInventorySchema = z
  .object({
    quantityOnHand: NonNegativeIntSchema.optional(),
    reservedQuantity: NonNegativeIntSchema.optional(),
    minimumStock: NonNegativeIntSchema.optional(),
    maximumStock: OptionalMaximumStockSchema,
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.quantityOnHand !== undefined ||
      value.reservedQuantity !== undefined ||
      value.minimumStock !== undefined ||
      value.maximumStock !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateInventoryInput = z.infer<typeof CreateInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof UpdateInventorySchema>;
export type InventoryIdParamInput = z.infer<typeof InventoryIdParamSchema>;
