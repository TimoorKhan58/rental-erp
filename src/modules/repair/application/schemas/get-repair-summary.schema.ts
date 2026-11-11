import { z } from "zod";

import {
  DateSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { REPAIR_STATUSES } from "@/modules/repair/domain/repair.constants";

export const GetRepairSummarySchema = z
  .object({
    status: z.enum(REPAIR_STATUSES).optional(),
    returnId: UUIDSchema.optional(),
    productId: UUIDSchema.optional(),
    warehouseId: UUIDSchema.optional(),
    repairDateFrom: DateSchema.optional(),
    repairDateTo: DateSchema.optional(),
    technician: TrimmedStringSchema.max(100).optional(),
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
      value.repairDateFrom !== undefined &&
      value.repairDateTo !== undefined &&
      value.repairDateFrom > value.repairDateTo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "repairDateFrom must be on or before repairDateTo",
        path: ["repairDateTo"],
      });
    }
  });

export type GetRepairSummaryInput = z.infer<typeof GetRepairSummarySchema>;
