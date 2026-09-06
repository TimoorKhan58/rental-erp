import { z } from "zod";

import {
  DateSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { RETURN_STATUSES } from "@/modules/return/domain/return.constants";

export const GetReturnSummarySchema = z
  .object({
    status: z.enum(RETURN_STATUSES).optional(),
    rentalOrderId: UUIDSchema.optional(),
    dispatchId: UUIDSchema.optional(),
    returnDateFrom: DateSchema.optional(),
    returnDateTo: DateSchema.optional(),
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
      value.returnDateFrom !== undefined &&
      value.returnDateTo !== undefined &&
      value.returnDateFrom > value.returnDateTo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "returnDateFrom must be on or before returnDateTo",
        path: ["returnDateTo"],
      });
    }
  });

export type GetReturnSummaryInput = z.infer<typeof GetReturnSummarySchema>;
