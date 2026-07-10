import { z } from "zod";

import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";

import { CATEGORY_SORT_FIELDS } from "@/modules/catalog/domain";

export const ListCategoriesSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  sortBy: z.enum(CATEGORY_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListCategoriesInput = z.infer<typeof ListCategoriesSchema>;
