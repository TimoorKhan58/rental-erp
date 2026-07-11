import type {
  ListNotificationsParams,
  MarkAllNotificationsReadResponse,
  NotificationListResponse,
  NotificationResponse,
} from "../types";
import { apiGet, apiPatch } from "@/lib/api";

const BASE = "/notifications";

export async function getNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationListResponse> {
  return apiGet<NotificationListResponse>(BASE, { params });
}

export async function getNotification(
  id: string,
): Promise<NotificationResponse> {
  return apiGet<NotificationResponse>(`${BASE}/${id}`);
}

/**
 * Backend has no dedicated unread-count endpoint.
 * Derive count from list meta with unread=true.
 */
export async function getUnreadCount(): Promise<number> {
  const result = await getNotifications({
    unread: true,
    page: 1,
    pageSize: 1,
  });
  return result.meta.total;
}

export async function markAsRead(id: string): Promise<NotificationResponse> {
  return apiPatch<NotificationResponse>(`${BASE}/${id}/read`);
}

export async function markAllAsRead(): Promise<MarkAllNotificationsReadResponse> {
  return apiPatch<MarkAllNotificationsReadResponse>(`${BASE}/read-all`);
}
