import { z } from "zod";

import {
  DateSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  MAINTENANCE_SERVICE_TYPES,
  MAINTENANCE_STATUSES,
} from "@/modules/maintenance/domain/maintenance.constants";

export const GetMaintenanceSummarySchema = z
  .object({
    status: z.enum(MAINTENANCE_STATUSES).optional(),
    productId: UUIDSchema.optional(),
    warehouseId: UUIDSchema.optional(),
    inventoryId: UUIDSchema.optional(),
    serviceType: z.enum(MAINTENANCE_SERVICE_TYPES).optional(),
    scheduledDateFrom: DateSchema.optional(),
    scheduledDateTo: DateSchema.optional(),
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
      value.scheduledDateFrom !== undefined &&
      value.scheduledDateTo !== undefined &&
      value.scheduledDateFrom > value.scheduledDateTo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "scheduledDateFrom must be on or before scheduledDateTo",
        path: ["scheduledDateTo"],
      });
    }
  });

export type GetMaintenanceSummaryInput = z.infer<
  typeof GetMaintenanceSummarySchema
>;
