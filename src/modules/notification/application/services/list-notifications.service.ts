import type { INotificationRepository } from "@/modules/notification/domain/notification.repository.interface";
import type { NotificationAccessContext } from "@/modules/notification/domain/notification.types";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";
import { ForbiddenError } from "@/shared/infrastructure/errors";

import type { NotificationDto } from "../dtos/notification.dto";
import {
  toNotificationDto,
  toNotificationListQuery,
} from "../mappers/notification.mapper";
import {
  ListNotificationsSchema,
  type ListNotificationsInput,
} from "../schemas/notification.schemas";

export class ListNotificationsService {
  constructor(private readonly repository: INotificationRepository) {}

  async execute(
    input: ListNotificationsInput,
    access: NotificationAccessContext,
  ): Promise<PaginatedResult<NotificationDto>> {
    const query = parseRequest(ListNotificationsSchema, input);

    if (query.recipientId !== undefined && !access.viewAll) {
      throw new ForbiddenError({
        message: "Recipient filter is only available to administrators",
        details: { field: "recipientId" },
      });
    }

    const result = await this.repository.findPaged(
      toNotificationListQuery(query, access),
    );

    return {
      items: result.items.map(toNotificationDto),
      meta: result.meta,
    };
  }
}
