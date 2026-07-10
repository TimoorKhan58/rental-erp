import { USER_ROLES } from "@/constants/roles";

import type { NotificationAccessContext } from "./notification.types";

export function canViewAllNotifications(role?: string): boolean {
  return role === USER_ROLES.OWNER;
}

export function toNotificationAccessContext(input: {
  viewerUserId: string;
  role?: string;
}): NotificationAccessContext {
  return {
    viewerUserId: input.viewerUserId,
    viewAll: canViewAllNotifications(input.role),
  };
}
