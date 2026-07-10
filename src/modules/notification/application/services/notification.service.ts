import { toNotificationAccessContext } from "@/modules/notification/domain/notification.access";
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
import type { INotificationService } from "./notification-application-services.interface";
import { GetNotificationByIdService } from "./get-notification-by-id.service";
import { ListNotificationsService } from "./list-notifications.service";
import { MarkAllNotificationsReadService } from "./mark-all-notifications-read.service";
import { MarkNotificationReadService } from "./mark-notification-read.service";

function resolveAccess(ctx: ExecutionContext) {
  if (ctx.request.userId === undefined) {
    throw new Error("Authenticated user id is required");
  }

  return toNotificationAccessContext({
    viewerUserId: ctx.request.userId,
    role: ctx.request.role,
  });
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly listNotificationsService: ListNotificationsService,
    private readonly getNotificationByIdService: GetNotificationByIdService,
    private readonly markNotificationReadService: MarkNotificationReadService,
    private readonly markAllNotificationsReadService: MarkAllNotificationsReadService,
  ) {}

  list(
    input: ListNotificationsInput,
    ctx: ExecutionContext,
  ): Promise<PaginatedResult<NotificationDto>> {
    return this.listNotificationsService.execute(input, resolveAccess(ctx));
  }

  getById(
    input: NotificationIdParamInput,
    ctx: ExecutionContext,
  ): Promise<NotificationDto> {
    return this.getNotificationByIdService.execute(input, resolveAccess(ctx));
  }

  markRead(
    input: NotificationIdParamInput,
    ctx: ExecutionContext,
  ): Promise<NotificationDto> {
    return this.markNotificationReadService.execute(input, resolveAccess(ctx));
  }

  markAllRead(ctx: ExecutionContext): Promise<MarkAllNotificationsReadDto> {
    return this.markAllNotificationsReadService.execute(resolveAccess(ctx));
  }
}
