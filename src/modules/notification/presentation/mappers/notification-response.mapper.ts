import type { NotificationDto } from "@/modules/notification/application/dtos/notification.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface NotificationResponse {
  id: string;
  recipientId: string;
  userId: string | null;
  recipientName: string;
  isRead: boolean;
  readAt: string | null;
  channel: string;
  status: string;
  priority: string;
  module: string;
  entityName: string;
  recordId: string;
  subject: string;
  title: string;
  body: string;
  scheduledAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  meta: PaginationMeta;
}

export interface MarkAllNotificationsReadResponse {
  markedCount: number;
}

export function toNotificationResponse(dto: NotificationDto): NotificationResponse {
  return {
    id: dto.id,
    recipientId: dto.recipientId,
    userId: dto.userId,
    recipientName: dto.recipientName,
    isRead: dto.isRead,
    readAt: dto.readAt,
    channel: dto.channel,
    status: dto.status,
    priority: dto.priority,
    module: dto.module,
    entityName: dto.entityName,
    recordId: dto.recordId,
    subject: dto.subject,
    title: dto.title,
    body: dto.body,
    scheduledAt: dto.scheduledAt,
    sentAt: dto.sentAt,
    deliveredAt: dto.deliveredAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toNotificationListResponse(
  result: PaginatedResult<NotificationDto>,
): NotificationListResponse {
  return {
    items: result.items.map(toNotificationResponse),
    meta: result.meta,
  };
}

export function toMarkAllNotificationsReadResponse(input: {
  markedCount: number;
}): MarkAllNotificationsReadResponse {
  return {
    markedCount: input.markedCount,
  };
}
