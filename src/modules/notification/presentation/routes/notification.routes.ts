export const NOTIFICATION_ROUTES = {
  base: "/api/notifications",
  byId: (id: string) => `/api/notifications/${id}`,
  markRead: (id: string) => `/api/notifications/${id}/read`,
  markAllRead: "/api/notifications/read-all",
} as const;

export type NotificationRouteKey = keyof typeof NOTIFICATION_ROUTES;
