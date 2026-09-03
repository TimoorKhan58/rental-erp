import { z } from "zod";

import {
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { EXPENSE_TYPES } from "@/modules/expense/domain/expense.constants";

import { ExpenseStatusFilterSchema } from "./expense.schemas";

export const GetExpenseSummarySchema = z
  .object({
    status: ExpenseStatusFilterSchema.optional(),
    expenseType: z.enum(EXPENSE_TYPES).optional(),
    categoryId: UUIDSchema.optional(),
    supplierId: UUIDSchema.optional(),
    search: TrimmedStringSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.search !== undefined && value.search.length > 200) {
      ctx.addIssue({
        code: "custom",
        message: "Search term must not exceed 200 characters",
        path: ["search"],
      });
    }
  });

export type GetExpenseSummaryInput = z.infer<typeof GetExpenseSummarySchema>;
