"use client";

import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query/mutations";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type {
  ListNotificationsParams,
  NotificationListResponse,
  NotificationResponse,
} from "../types";
import {
  getNotification,
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "../services";

/**
 * Invalidate helpers kept in one place so future WebSocket / SSE / push
 * handlers can refresh the notification center without restructuring the feature.
 */
export function invalidateNotificationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

export function useNotificationPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];
  const canRead = permissions.includes(PERMISSIONS.notifications.read);

  return {
    isLoading,
    canRead,
    /**
     * Mark-as-read is gated by `notifications:read` on the backend.
     * There is no `notifications:update` permission in the RBAC catalog.
     */
    canUpdate: canRead,
  };
}

export function useNotifications(params: ListNotificationsParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => getNotifications(params),
    enabled,
  });
}

export function useNotification(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.detail(id),
    queryFn: () => getNotification(id),
    enabled: enabled && Boolean(id),
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadCount,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: markAsRead,
    showSuccessToast: false,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousUnread = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount(),
      );
      const previousDetail = queryClient.getQueryData<NotificationResponse>(
        queryKeys.notifications.detail(id),
      );

      const listSnapshots = queryClient.getQueriesData<NotificationListResponse>({
        queryKey: queryKeys.notifications.lists(),
      });

      if (typeof previousUnread === "number" && previousUnread > 0) {
        const wasUnread = previousDetail ? !previousDetail.isRead : true;
        if (wasUnread) {
          queryClient.setQueryData(
            queryKeys.notifications.unreadCount(),
            previousUnread - 1,
          );
        }
      }

      const readAt = new Date().toISOString();

      if (previousDetail && !previousDetail.isRead) {
        queryClient.setQueryData(queryKeys.notifications.detail(id), {
          ...previousDetail,
          isRead: true,
          readAt,
        });
      }

      listSnapshots.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(key, {
          ...data,
          items: data.items.map((item) =>
            item.id === id && !item.isRead
              ? { ...item, isRead: true, readAt }
              : item,
          ),
        });
      });

      return { previousUnread, previousDetail, listSnapshots };
    },
    onError: (_error, id, context) => {
      if (!context) return;
      if (typeof context.previousUnread === "number") {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousUnread,
        );
      }
      if (context.previousDetail) {
        queryClient.setQueryData(
          queryKeys.notifications.detail(id),
          context.previousDetail,
        );
      }
      context.listSnapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.notifications.detail(data.id), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.unreadCount(),
        }),
      ]);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useAppMutation<
    Awaited<ReturnType<typeof markAllAsRead>>,
    void,
    {
      previousUnread: number | undefined;
      listSnapshots: Array<readonly [QueryKey, NotificationListResponse | undefined]>;
    }
  >({
    mutationFn: async () => markAllAsRead(),
    showSuccessToast: true,
    successMessage: "All notifications marked as read.",
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      const previousUnread = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount(),
      );
      const listSnapshots = queryClient.getQueriesData<NotificationListResponse>({
        queryKey: queryKeys.notifications.lists(),
      });

      queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);

      const readAt = new Date().toISOString();
      listSnapshots.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(key, {
          ...data,
          items: data.items.map((item) =>
            item.isRead ? item : { ...item, isRead: true, readAt },
          ),
        });
      });

      return { previousUnread, listSnapshots };
    },
    onError: (_error, _vars, context) => {
      if (!context) return;
      if (typeof context.previousUnread === "number") {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousUnread,
        );
      }
      context.listSnapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}
