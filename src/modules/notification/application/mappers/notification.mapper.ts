import type { NotificationInboxItem } from "@/modules/notification/domain/notification.entity";
import type { NotificationListQuery } from "@/modules/notification/domain/notification-list.query";
import type { NotificationAccessContext } from "@/modules/notification/domain/notification.types";
import type { NotificationId } from "@/shared/domain/ids";

import type { NotificationDto } from "../dtos/notification.dto";
import type { ListNotificationsInput } from "../schemas/notification.schemas";

function toIsoString(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export function toNotificationDto(item: NotificationInboxItem): NotificationDto {
  const props = item.toProps();

  return {
    id: props.notificationId,
    recipientId: props.recipientId,
    userId: props.userId,
    recipientName: props.recipientName,
    isRead: props.isRead,
    readAt: toIsoString(props.readAt),
    channel: props.channel,
    status: props.status,
    priority: props.priority,
    module: props.module,
    entityName: props.entityName,
    recordId: props.recordId,
    subject: props.subject,
    title: props.title,
    body: props.body,
    scheduledAt: toIsoString(props.scheduledAt),
    sentAt: toIsoString(props.sentAt),
    deliveredAt: toIsoString(props.deliveredAt),
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toNotificationId(id: string): NotificationId {
  return id as NotificationId;
}

export function toNotificationListQuery(
  input: ListNotificationsInput,
  access: NotificationAccessContext,
): NotificationListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    type: input.type,
    status: input.status,
    read: input.read,
    unread: input.unread,
    fromDate: input.fromDate,
    toDate: input.toDate,
    recipientId: input.recipientId,
    access,
  };
}
