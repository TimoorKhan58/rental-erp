import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import { NotFoundError, UnprocessableError } from "@/shared/infrastructure/errors";

import type { ResolvedNotificationTemplate } from "./notification-payload.mapper";

export async function resolveNotificationTemplate(
  db: DbClient,
  eventKey: string,
): Promise<ResolvedNotificationTemplate> {
  const template = await db.notificationTemplate.findUnique({
    where: { eventKey },
    select: {
      id: true,
      channel: true,
      subject: true,
      title: true,
      body: true,
      enabled: true,
    },
  });

  if (template === null) {
    throw new NotFoundError({
      message: `Notification template not found for event key "${eventKey}"`,
      details: { eventKey },
    });
  }

  if (!template.enabled) {
    throw new UnprocessableError({
      message: `Notification template is disabled for event key "${eventKey}"`,
      details: { eventKey },
    });
  }

  return {
    id: template.id,
    channel: template.channel,
    subject: template.subject,
    title: template.title,
    body: template.body,
  };
}
