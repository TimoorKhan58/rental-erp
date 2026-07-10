import { z } from "zod";

import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";

import { EXPENSE_CATEGORY_SORT_FIELDS } from "@/modules/expense/domain/expense-category.constants";

export const ListExpenseCategoriesSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  sortBy: z.enum(EXPENSE_CATEGORY_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListExpenseCategoriesInput = z.infer<
  typeof ListExpenseCategoriesSchema
>;
