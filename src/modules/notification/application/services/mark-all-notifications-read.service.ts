import type { INotificationRepository } from "@/modules/notification/domain/notification.repository.interface";
import type { NotificationAccessContext } from "@/modules/notification/domain/notification.types";

import type { MarkAllNotificationsReadDto } from "../dtos/notification.dto";

export class MarkAllNotificationsReadService {
  constructor(private readonly repository: INotificationRepository) {}

  async execute(
    access: NotificationAccessContext,
  ): Promise<MarkAllNotificationsReadDto> {
    const result = await this.repository.markAllAsRead(access.viewerUserId);

    return {
      markedCount: result.markedCount,
    };
  }
}
