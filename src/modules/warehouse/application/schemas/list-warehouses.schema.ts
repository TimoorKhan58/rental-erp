import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import { WAREHOUSE_SORT_FIELDS } from "@/modules/warehouse/domain/warehouse.constants";

export const ListWarehousesSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  sortBy: z.enum(WAREHOUSE_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListWarehousesInput = z.infer<typeof ListWarehousesSchema>;
