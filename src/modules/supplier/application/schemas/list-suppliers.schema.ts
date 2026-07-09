import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import { SUPPLIER_SORT_FIELDS } from "@/modules/supplier/domain/supplier.constants";

export const ListSuppliersSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  sortBy: z.enum(SUPPLIER_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListSuppliersInput = z.infer<typeof ListSuppliersSchema>;
