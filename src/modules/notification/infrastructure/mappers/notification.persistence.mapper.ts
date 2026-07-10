import { NotificationInboxItem } from "@/modules/notification/domain/notification.entity";
import type { NotificationId } from "@/shared/domain/ids";
import type {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from "@/shared/infrastructure/notifications/notification-types";

type NotificationRecord = {
  id: string;
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
};

type NotificationRecipientRecord = {
  id: string;
  notificationId: string;
  userId: string | null;
  recipientName: string;
  isRead: boolean;
  readAt: Date | null;
};

export function toNotificationInboxItemDomain(
  recipient: NotificationRecipientRecord,
  notification: NotificationRecord,
): NotificationInboxItem {
  return NotificationInboxItem.reconstitute({
    recipientId: recipient.id,
    notificationId: notification.id as NotificationId,
    userId: recipient.userId,
    recipientName: recipient.recipientName,
    isRead: recipient.isRead,
    readAt: recipient.readAt,
    channel: notification.channel,
    status: notification.status,
    priority: notification.priority,
    module: notification.module,
    entityName: notification.entityName,
    recordId: notification.recordId,
    subject: notification.subject,
    title: notification.title,
    body: notification.body,
    scheduledAt: notification.scheduledAt,
    sentAt: notification.sentAt,
    deliveredAt: notification.deliveredAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  });
}
