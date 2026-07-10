import type {
  NotificationChannel,
  NotificationStatus,
} from "@/shared/infrastructure/notifications/notification-types";

import type { NotificationAccessContext } from "./notification.types";

export interface NotificationListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  type?: NotificationChannel;
  status?: NotificationStatus;
  read?: boolean;
  unread?: boolean;
  fromDate?: Date;
  toDate?: Date;
  recipientId?: string;
  access: NotificationAccessContext;
}
