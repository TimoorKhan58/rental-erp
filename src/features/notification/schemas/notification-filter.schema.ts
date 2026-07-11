import { z } from "zod";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationStatus,
} from "../types";

export const notificationListFilterSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    type: z.enum(NOTIFICATION_CHANNELS).optional(),
    status: z.enum(NOTIFICATION_STATUSES).optional(),
    read: z.boolean().optional(),
    unread: z.boolean().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    recipientId: z.string().trim().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.read === true && value.unread === true) {
      ctx.addIssue({
        code: "custom",
        message: "Cannot filter by both read and unread",
        path: ["read"],
      });
    }

    if (value.fromDate && value.toDate && value.fromDate > value.toDate) {
      ctx.addIssue({
        code: "custom",
        message: "Start date must be on or before end date",
        path: ["fromDate"],
      });
    }
  });

export type NotificationListFilterValues = z.infer<
  typeof notificationListFilterSchema
>;

export function parseNotificationListFilters(
  raw: Partial<{
    search?: string;
    type?: string;
    status?: string;
    read?: boolean;
    unread?: boolean;
    fromDate?: string;
    toDate?: string;
    recipientId?: string;
  }>,
): Partial<NotificationListFilterValues> {
  const normalized = {
    search: raw.search?.trim() || undefined,
    type: raw.type as NotificationChannel | undefined,
    status: raw.status as NotificationStatus | undefined,
    read: raw.read,
    unread: raw.unread,
    fromDate: raw.fromDate || undefined,
    toDate: raw.toDate || undefined,
    recipientId: raw.recipientId?.trim() || undefined,
  };

  const parsed = notificationListFilterSchema.safeParse(normalized);
  if (parsed.success) {
    return parsed.data;
  }

  const next: Partial<NotificationListFilterValues> = { ...normalized };
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && key in next) {
      delete next[key as keyof NotificationListFilterValues];
    }
  }

  if (
    parsed.error.issues.some(
      (issue) => issue.path[0] === "fromDate" || issue.path[0] === "toDate",
    )
  ) {
    delete next.fromDate;
    delete next.toDate;
  }

  if (parsed.error.issues.some((issue) => issue.path[0] === "read")) {
    delete next.read;
    delete next.unread;
  }

  return next;
}
