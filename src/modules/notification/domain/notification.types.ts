import type { NotificationId } from "@/shared/domain/ids";
import type {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from "@/shared/infrastructure/notifications/notification-types";

export interface NotificationInboxItemProps {
  recipientId: string;
  notificationId: NotificationId;
  userId: string | null;
  recipientName: string;
  isRead: boolean;
  readAt: Date | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: NotificationPriority;
  module: string;
  entityName: string;
  recordId: string;
  subject: string;
  title: string;
  body: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationAccessContext {
  viewerUserId: string;
  viewAll: boolean;
}
