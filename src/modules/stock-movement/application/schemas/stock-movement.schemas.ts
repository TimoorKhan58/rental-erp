import { z } from "zod";

import {
  PositiveIntSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { STOCK_MOVEMENT_TYPES } from "@/modules/stock-movement/domain/stock-movement.constants";

export const StockMovementIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateStockMovementSchema = z.object({
  inventoryId: UUIDSchema,
  movementType: z.enum(STOCK_MOVEMENT_TYPES),
  quantity: PositiveIntSchema,
  referenceType: z.string().trim().max(100).nullable().optional(),
  referenceId: z.string().trim().max(100).nullable().optional(),
  remarks: z.string().trim().max(500).optional(),
});

export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;
export type StockMovementIdParamInput = z.infer<
  typeof StockMovementIdParamSchema
>;
