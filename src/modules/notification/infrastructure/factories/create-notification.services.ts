import type { NotificationApplicationServices } from "@/modules/notification/application/services/notification-application-services.interface";
import { NotificationService } from "@/modules/notification/application/services/notification.service";
import type { INotificationService } from "@/modules/notification/application/services/notification-application-services.interface";
import { GetNotificationByIdService } from "@/modules/notification/application/services/get-notification-by-id.service";
import { ListNotificationsService } from "@/modules/notification/application/services/list-notifications.service";
import { MarkAllNotificationsReadService } from "@/modules/notification/application/services/mark-all-notifications-read.service";
import { MarkNotificationReadService } from "@/modules/notification/application/services/mark-notification-read.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createNotificationRepositoryFromSharedDeps } from "./create-notification.repository";

export interface WiredNotificationApplicationServices
  extends NotificationApplicationServices {
  notificationService: INotificationService;
}

export function createNotificationApplicationServices(
  deps: SharedDeps,
): WiredNotificationApplicationServices {
  const repository = createNotificationRepositoryFromSharedDeps(deps);

  const listNotifications = new ListNotificationsService(repository);
  const getNotificationById = new GetNotificationByIdService(repository);
  const markNotificationRead = new MarkNotificationReadService(repository);
  const markAllNotificationsRead = new MarkAllNotificationsReadService(repository);

  return {
    listNotifications,
    getNotificationById,
    markNotificationRead,
    markAllNotificationsRead,
    notificationService: new NotificationService(
      listNotifications,
      getNotificationById,
      markNotificationRead,
      markAllNotificationsRead,
    ),
  };
}
