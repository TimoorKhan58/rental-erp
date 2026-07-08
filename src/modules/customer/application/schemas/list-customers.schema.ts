import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import { CUSTOMER_SORT_FIELDS } from "@/modules/customer/domain/customer.constants";

export const ListCustomersSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  sortBy: z.enum(CUSTOMER_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListCustomersInput = z.infer<typeof ListCustomersSchema>;
