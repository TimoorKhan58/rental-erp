import { z } from "zod";

import { AUDIT_SORT_FIELDS } from "@/modules/audit/domain/audit-log.constants";
import {
  DateSchema,
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";
import { AUDIT_ACTIONS } from "@/shared/infrastructure/audit/audit-logger.interface";

const AuditDateRangeRefine = (
  value: { fromDate?: Date; toDate?: Date },
  ctx: z.RefinementCtx,
) => {
  if (
    value.fromDate !== undefined &&
    value.toDate !== undefined &&
    value.fromDate.getTime() > value.toDate.getTime()
  ) {
    ctx.addIssue({
      code: "custom",
      message: "fromDate must be on or before toDate",
      path: ["fromDate"],
    });
  }
};

export const AuditIdParamSchema = z.object({
  id: UUIDSchema,
});

export const ListAuditSchema = PaginationSchema.extend({
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
  userId: UUIDSchema.optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  fromDate: DateSchema.optional(),
  toDate: DateSchema.optional(),
  sortBy: z.enum(AUDIT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  AuditDateRangeRefine(value, ctx);

  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type AuditIdParamInput = z.infer<typeof AuditIdParamSchema>;
export type ListAuditInput = z.infer<typeof ListAuditSchema>;
