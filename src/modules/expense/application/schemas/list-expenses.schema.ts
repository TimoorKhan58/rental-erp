import { z } from "zod";

import { PaginationSchema, UUIDSchema } from "@/shared/application/validation";

import { EXPENSE_SORT_FIELDS, EXPENSE_TYPES } from "@/modules/expense/domain/expense.constants";

import { ExpenseStatusFilterSchema } from "./expense.schemas";

export const ListExpensesSchema = PaginationSchema.extend({
  status: ExpenseStatusFilterSchema.optional(),
  expenseType: z.enum(EXPENSE_TYPES).optional(),
  categoryId: UUIDSchema.optional(),
  supplierId: UUIDSchema.optional(),
  sortBy: z.enum(EXPENSE_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListExpensesInput = z.infer<typeof ListExpensesSchema>;
