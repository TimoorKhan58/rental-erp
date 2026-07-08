import type { Prisma } from "@/generated/prisma/client";
import {
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
  NotificationStatus as PrismaNotificationStatus,
} from "@/generated/prisma/client";
import { ValidationError } from "@/shared/infrastructure/errors";

import type {
  NotificationPayload,
  NotificationPriority,
  RecipientInput,
} from "./notification-types";

export interface ResolvedNotificationTemplate {
  id: string;
  channel: PrismaNotificationChannel;
  subject: string | null;
  title: string;
  body: string;
}

function toPrismaNotificationPriority(
  priority: NotificationPriority,
): PrismaNotificationPriority {
  return priority as PrismaNotificationPriority;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapRecipientToCreateInput(
  recipient: RecipientInput,
): Prisma.NotificationRecipientUncheckedCreateWithoutNotificationInput {
  const recipientName = normalizeOptionalString(recipient.name);

  if (recipientName === undefined) {
    throw new ValidationError({
      message: "Recipient name is required",
      details: { field: "recipients.name" },
    });
  }

  return {
    userId: recipient.userId,
    recipientName,
    recipientEmail: normalizeOptionalString(recipient.email),
    recipientPhone: normalizeOptionalString(recipient.phone),
    recipientWhatsApp: normalizeOptionalString(recipient.whatsApp),
  };
}

export function validateNotificationPayload(payload: NotificationPayload): void {
  if (payload.recipients.length === 0) {
    throw new ValidationError({
      message: "At least one recipient is required",
      details: { field: "recipients" },
    });
  }
}

export function mapNotificationPayloadToCreateInput(
  payload: NotificationPayload,
  template: ResolvedNotificationTemplate,
): Prisma.NotificationUncheckedCreateInput {
  validateNotificationPayload(payload);

  return {
    templateId: template.id,
    channel: template.channel,
    status: PrismaNotificationStatus.PENDING,
    priority: toPrismaNotificationPriority(payload.priority ?? "NORMAL"),
    module: payload.module,
    entityName: payload.entityName,
    recordId: payload.recordId,
    subject: template.subject ?? template.title,
    title: template.title,
    body: template.body,
    scheduledAt: payload.scheduledAt,
    recipients: {
      create: payload.recipients.map(mapRecipientToCreateInput),
    },
  };
}
