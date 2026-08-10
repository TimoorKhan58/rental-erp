import type { DbClient } from "@/shared/infrastructure/database/prisma-types";

import { resolveUserRecipients } from "./notification-recipient-resolver";
import type { INotificationService } from "./notification-service.interface";
import type {
  NotificationPayload,
  NotificationPriority,
} from "./notification-types";

export interface EnqueueWorkflowNotificationInput {
  eventKey: string;
  module: string;
  entityName: string;
  recordId: string;
  recipientUserIds: readonly string[];
  priority?: NotificationPriority;
  data?: Record<string, unknown>;
}

export async function enqueueWorkflowNotification(
  notificationService: INotificationService,
  db: DbClient,
  input: EnqueueWorkflowNotificationInput,
): Promise<void> {
  const recipients = await resolveUserRecipients(db, input.recipientUserIds);

  if (recipients.length === 0) {
    return;
  }

  const payload: NotificationPayload = {
    eventKey: input.eventKey,
    module: input.module,
    entityName: input.entityName,
    recordId: input.recordId,
    recipients,
    priority: input.priority,
    data: input.data,
  };

  await notificationService.enqueue(payload);
}
