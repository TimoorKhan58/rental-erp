import { z } from "zod";

import {
  DateSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { DISPATCH_STATUSES } from "@/modules/dispatch/domain";

export const GetDispatchSummarySchema = z
  .object({
    status: z.enum(DISPATCH_STATUSES).optional(),
    rentalOrderId: UUIDSchema.optional(),
    warehouseId: UUIDSchema.optional(),
    dispatchDateFrom: DateSchema.optional(),
    dispatchDateTo: DateSchema.optional(),
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
  })
  .superRefine((value, ctx) => {
    if (
      value.dispatchDateFrom !== undefined &&
      value.dispatchDateTo !== undefined &&
      value.dispatchDateFrom > value.dispatchDateTo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "dispatchDateFrom must be on or before dispatchDateTo",
        path: ["dispatchDateTo"],
      });
    }
  });

export type GetDispatchSummaryInput = z.infer<typeof GetDispatchSummarySchema>;
