import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import { PRODUCT_SORT_FIELDS } from "@/modules/product/domain/product.constants";

export const ListProductsSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  sortBy: z.enum(PRODUCT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListProductsInput = z.infer<typeof ListProductsSchema>;
