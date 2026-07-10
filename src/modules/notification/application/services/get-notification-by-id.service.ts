import { NotificationNotFoundError } from "@/modules/notification/domain/notification.errors";
import type { INotificationRepository } from "@/modules/notification/domain/notification.repository.interface";
import type { NotificationAccessContext } from "@/modules/notification/domain/notification.types";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { NotificationDto } from "../dtos/notification.dto";
import {
  toNotificationDto,
  toNotificationId,
} from "../mappers/notification.mapper";
import {
  NotificationIdParamSchema,
  type NotificationIdParamInput,
} from "../schemas/notification.schemas";

export class GetNotificationByIdService {
  constructor(private readonly repository: INotificationRepository) {}

  async execute(
    input: NotificationIdParamInput,
    access: NotificationAccessContext,
  ): Promise<NotificationDto> {
    const params = parseRequest(NotificationIdParamSchema, input);
    const item = await this.repository.findById(
      toNotificationId(params.id),
      access,
    );

    if (item === null) {
      const notFound = new NotificationNotFoundError(params.id);
      throw new NotFoundError({
        message: notFound.message,
        details: { id: params.id },
      });
    }

    return toNotificationDto(item);
  }
}
