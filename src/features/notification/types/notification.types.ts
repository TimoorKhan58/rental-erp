import type { PaginationMeta } from "@/types/api";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationStatus,
} from "@/shared/infrastructure/notifications/notification-types";

export {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
};
export type { NotificationChannel, NotificationPriority, NotificationStatus };

export type NotificationResponse = {
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
};

export type NotificationListResponse = {
  items: NotificationResponse[];
  meta: PaginationMeta;
};

export type MarkAllNotificationsReadResponse = {
  markedCount: number;
};

export type NotificationSortField =
  | "createdAt"
  | "title"
  | "status"
  | "channel"
  | "priority"
  | "module"
  | "isRead"
  | "readAt";

export type ListNotificationsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: NotificationSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  /** Maps to backend `type` (channel). */
  type?: NotificationChannel;
  status?: NotificationStatus;
  read?: boolean;
  unread?: boolean;
  fromDate?: string;
  toDate?: string;
  recipientId?: string;
};

export type ReadFilter = "all" | "read" | "unread";
