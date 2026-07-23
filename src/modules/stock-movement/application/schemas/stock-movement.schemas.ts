import { z } from "zod";

import {
  UUIDSchema,
} from "@/shared/application/validation";

import { STOCK_MOVEMENT_TYPES } from "@/modules/stock-movement/domain/stock-movement.constants";

export const StockMovementIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateStockMovementSchema = z
  .object({
    inventoryId: UUIDSchema,
    movementType: z.enum(STOCK_MOVEMENT_TYPES),
    quantity: z.coerce.number().int(),
    referenceType: z.string().trim().max(100).nullable().optional(),
    referenceId: z.string().trim().max(100).nullable().optional(),
    remarks: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.movementType === "ADJUSTMENT") {
      if (data.quantity === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Adjustment quantity cannot be zero",
          path: ["quantity"],
        });
      }
      return;
    }

    if (data.quantity <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Quantity must be greater than zero",
        path: ["quantity"],
      });
    }
  });

export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;
export type StockMovementIdParamInput = z.infer<
  typeof StockMovementIdParamSchema
>;
