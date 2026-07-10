import type {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from "@/shared/infrastructure/notifications/notification-types";

export interface NotificationDto {
  id: string;
  recipientId: string;
  userId: string | null;
  recipientName: string;
  isRead: boolean;
  readAt: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: NotificationPriority;
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

export interface NotificationIdParamDto {
  id: string;
}

export interface MarkAllNotificationsReadDto {
  markedCount: number;
}
