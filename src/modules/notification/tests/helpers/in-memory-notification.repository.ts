import { NotificationInboxItem } from "@/modules/notification/domain/notification.entity";
import type { NotificationListQuery } from "@/modules/notification/domain/notification-list.query";
import type { INotificationRepository } from "@/modules/notification/domain/notification.repository.interface";
import type { NotificationInboxItemProps } from "@/modules/notification/domain/notification.types";
import type { NotificationId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

export const NOTIFICATION_VIEWER_ID = "nn0e8400-e29b-41d4-a716-446655440000";
export const OTHER_USER_ID = "nn0e8400-e29b-41d4-a716-446655440001";

export function buildNotificationItem(
  override: Partial<NotificationInboxItemProps> = {},
): NotificationInboxItem {
  const now = new Date("2026-03-01T10:00:00.000Z");

  return NotificationInboxItem.reconstitute({
    recipientId: crypto.randomUUID(),
    notificationId: crypto.randomUUID() as NotificationId,
    userId: NOTIFICATION_VIEWER_ID,
    recipientName: "Viewer User",
    isRead: false,
    readAt: null,
    channel: "IN_APP",
    status: "DELIVERED",
    priority: "NORMAL",
    module: "expenses",
    entityName: "Expense",
    recordId: "expense-1",
    subject: "Expense approved",
    title: "Expense approved",
    body: "Your expense was approved.",
    scheduledAt: null,
    sentAt: now,
    deliveredAt: now,
    createdAt: now,
    updatedAt: now,
    ...override,
  });
}

export class InMemoryNotificationRepository implements INotificationRepository {
  private items: NotificationInboxItem[] = [];

  seed(items: NotificationInboxItem[]): void {
    this.items = [...items];
  }

  async findById(
    id: NotificationId,
    access: NotificationListQuery["access"],
  ): Promise<NotificationInboxItem | null> {
    const item = this.items.find((entry) => entry.notificationId === id);

    if (item === undefined) {
      return null;
    }

    if (!access.viewAll && item.userId !== access.viewerUserId) {
      return null;
    }

    return item;
  }

  async findPaged(
    query: NotificationListQuery,
  ): Promise<PaginatedResult<NotificationInboxItem>> {
    let filtered = this.items.filter((item) => {
      if (query.access.viewAll) {
        return true;
      }

      return item.userId === query.access.viewerUserId;
    });

    if (query.recipientId !== undefined) {
      filtered = filtered.filter(
        (item) => item.recipientId === query.recipientId,
      );
    }

    if (query.unread === true) {
      filtered = filtered.filter((item) => !item.isRead);
    }

    if (query.read === true) {
      filtered = filtered.filter((item) => item.isRead);
    }

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    return {
      items: slice,
      meta: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
    };
  }

  async markAsRead(
    id: NotificationId,
    access: NotificationListQuery["access"],
  ): Promise<NotificationInboxItem | null> {
    const item = await this.findById(id, access);

    if (item === null) {
      return null;
    }

    const updated = NotificationInboxItem.reconstitute({
      ...item.toProps(),
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    });

    this.items = this.items.map((entry) =>
      entry.notificationId === id ? updated : entry,
    );

    return updated;
  }

  async markAllAsRead(userId: string) {
    let markedCount = 0;

    this.items = this.items.map((item) => {
      if (item.userId !== userId || item.isRead) {
        return item;
      }

      markedCount += 1;
      return NotificationInboxItem.reconstitute({
        ...item.toProps(),
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      });
    });

    return { markedCount };
  }
}
