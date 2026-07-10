import type { NotificationId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { NotificationInboxItem } from "./notification.entity";
import type { NotificationListQuery } from "./notification-list.query";
import type { NotificationAccessContext } from "./notification.types";

export interface MarkAllNotificationsReadResult {
  markedCount: number;
}

export interface INotificationRepository {
  findById(
    id: NotificationId,
    access: NotificationAccessContext,
  ): Promise<NotificationInboxItem | null>;
  findPaged(
    query: NotificationListQuery,
  ): Promise<PaginatedResult<NotificationInboxItem>>;
  markAsRead(
    id: NotificationId,
    access: NotificationAccessContext,
  ): Promise<NotificationInboxItem | null>;
  markAllAsRead(userId: string): Promise<MarkAllNotificationsReadResult>;
}
