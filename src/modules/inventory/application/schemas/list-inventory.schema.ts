import {
  BooleanStringSchema,
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import { INVENTORY_SORT_FIELDS } from "@/modules/inventory/domain/inventory.constants";

export const ListInventorySchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  productId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  sortBy: z.enum(INVENTORY_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListInventoryInput = z.infer<typeof ListInventorySchema>;
