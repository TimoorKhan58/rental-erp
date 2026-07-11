import { z } from "zod";
import { AUDIT_ACTIONS } from "../types";

export const auditListFilterSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    entityType: z.string().trim().min(1).optional(),
    entityId: z.string().trim().min(1).optional(),
    userId: z.string().trim().uuid().optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fromDate && value.toDate && value.fromDate > value.toDate) {
      ctx.addIssue({
        code: "custom",
        message: "Start date must be on or before end date",
        path: ["fromDate"],
      });
    }
  });

export type AuditListFilterValues = z.infer<typeof auditListFilterSchema>;

/** Soft-validate URL/UI filter values before sending to the API. */
export function parseAuditListFilters(
  raw: Partial<AuditListFilterValues>,
): Partial<AuditListFilterValues> {
  const normalized: Partial<AuditListFilterValues> = {
    search: raw.search?.trim() || undefined,
    entityType: raw.entityType?.trim() || undefined,
    entityId: raw.entityId?.trim() || undefined,
    userId: raw.userId?.trim() || undefined,
    action: raw.action,
    fromDate: raw.fromDate || undefined,
    toDate: raw.toDate || undefined,
  };

  const parsed = auditListFilterSchema.safeParse(normalized);
  if (parsed.success) {
    return parsed.data;
  }

  // Drop only fields that failed; keep the rest when possible.
  const next: Partial<AuditListFilterValues> = { ...normalized };
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && key in next) {
      delete next[key as keyof AuditListFilterValues];
    }
  }

  // If the date range refine failed, drop both ends.
  if (
    parsed.error.issues.some(
      (issue) => issue.path[0] === "fromDate" || issue.path[0] === "toDate",
    )
  ) {
    delete next.fromDate;
    delete next.toDate;
  }

  return next;
}
