import type { ExecutionContext } from "@/shared/application/context";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type {
  MarkAllNotificationsReadDto,
  NotificationDto,
} from "../dtos/notification.dto";
import type {
  ListNotificationsInput,
  NotificationIdParamInput,
} from "../schemas/notification.schemas";
import type { GetNotificationByIdService } from "./get-notification-by-id.service";
import type { ListNotificationsService } from "./list-notifications.service";
import type { MarkAllNotificationsReadService } from "./mark-all-notifications-read.service";
import type { MarkNotificationReadService } from "./mark-notification-read.service";

export interface NotificationApplicationServices {
  listNotifications: ListNotificationsService;
  getNotificationById: GetNotificationByIdService;
  markNotificationRead: MarkNotificationReadService;
  markAllNotificationsRead: MarkAllNotificationsReadService;
  notificationService: INotificationService;
}

export type NotificationServiceResolver = (
  ctx: ExecutionContext,
) => NotificationApplicationServices;

export interface INotificationService {
  list(
    input: ListNotificationsInput,
    ctx: ExecutionContext,
  ): Promise<PaginatedResult<NotificationDto>>;
  getById(
    input: NotificationIdParamInput,
    ctx: ExecutionContext,
  ): Promise<NotificationDto>;
  markRead(
    input: NotificationIdParamInput,
    ctx: ExecutionContext,
  ): Promise<NotificationDto>;
  markAllRead(ctx: ExecutionContext): Promise<MarkAllNotificationsReadDto>;
}
