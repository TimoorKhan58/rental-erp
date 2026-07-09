import {
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import {
  STOCK_MOVEMENT_SORT_FIELDS,
  STOCK_MOVEMENT_TYPES,
} from "@/modules/stock-movement/domain/stock-movement.constants";

export const ListStockMovementsSchema = PaginationSchema.extend({
  inventoryId: UUIDSchema.optional(),
  productId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  movementType: z.enum(STOCK_MOVEMENT_TYPES).optional(),
  sortBy: z.enum(STOCK_MOVEMENT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListStockMovementsInput = z.infer<typeof ListStockMovementsSchema>;
