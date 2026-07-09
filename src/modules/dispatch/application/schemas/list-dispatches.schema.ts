import { PaginationSchema, UUIDSchema } from "@/shared/application/validation";
import { z } from "zod";

import {
  DISPATCH_SORT_FIELDS,
  DISPATCH_STATUSES,
} from "@/modules/dispatch/domain";

export const ListDispatchesSchema = PaginationSchema.extend({
  status: z.enum(DISPATCH_STATUSES).optional(),
  rentalOrderId: UUIDSchema.optional(),
  sortBy: z.enum(DISPATCH_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListDispatchesInput = z.infer<typeof ListDispatchesSchema>;
