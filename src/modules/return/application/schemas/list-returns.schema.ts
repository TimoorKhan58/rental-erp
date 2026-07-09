import { PaginationSchema, UUIDSchema } from "@/shared/application/validation";
import { z } from "zod";

import {
  RETURN_SORT_FIELDS,
  RETURN_STATUSES,
} from "@/modules/return/domain";

export const ListReturnsSchema = PaginationSchema.extend({
  status: z.enum(RETURN_STATUSES).optional(),
  rentalOrderId: UUIDSchema.optional(),
  dispatchId: UUIDSchema.optional(),
  sortBy: z.enum(RETURN_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListReturnsInput = z.infer<typeof ListReturnsSchema>;
