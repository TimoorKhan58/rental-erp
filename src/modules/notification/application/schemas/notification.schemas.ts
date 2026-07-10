import { z } from "zod";

import { NOTIFICATION_SORT_FIELDS } from "@/modules/notification/domain/notification.constants";
import {
  BooleanStringSchema,
  DateSchema,
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
} from "@/shared/infrastructure/notifications/notification-types";

const NotificationDateRangeRefine = (
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

const NotificationReadFilterRefine = (
  value: { read?: boolean; unread?: boolean },
  ctx: z.RefinementCtx,
) => {
  if (value.read === true && value.unread === true) {
    ctx.addIssue({
      code: "custom",
      message: "read and unread filters cannot both be true",
      path: ["read"],
    });
  }
};

export const NotificationIdParamSchema = z.object({
  id: UUIDSchema,
});

export const ListNotificationsSchema = PaginationSchema.extend({
  type: z.enum(NOTIFICATION_CHANNELS).optional(),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  read: BooleanStringSchema.optional(),
  unread: BooleanStringSchema.optional(),
  fromDate: DateSchema.optional(),
  toDate: DateSchema.optional(),
  recipientId: UUIDSchema.optional(),
  sortBy: z.enum(NOTIFICATION_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  NotificationDateRangeRefine(value, ctx);
  NotificationReadFilterRefine(value, ctx);

  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type NotificationIdParamInput = z.infer<typeof NotificationIdParamSchema>;
export type ListNotificationsInput = z.infer<typeof ListNotificationsSchema>;
