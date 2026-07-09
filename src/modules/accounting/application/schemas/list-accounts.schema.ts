import { z } from "zod";

import { PaginationSchema } from "@/shared/application/validation";

import { ACCOUNT_SORT_FIELDS } from "@/modules/accounting/domain/account.constants";

import { AccountTypeFilterSchema } from "./account.schemas";

export const ListAccountsSchema = PaginationSchema.extend({
  accountType: AccountTypeFilterSchema.optional(),
  isActive: z
    .union([
      z.boolean(),
      z.enum(["true", "false"]).transform((value) => value === "true"),
    ])
    .optional(),
  sortBy: z.enum(ACCOUNT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListAccountsInput = z.infer<typeof ListAccountsSchema>;
