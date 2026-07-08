import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { NotificationStatus as PrismaNotificationStatus } from "@/generated/prisma/client";
import {
  resolveDbClient,
  withPrismaError,
} from "@/shared/infrastructure/database/repository-base";
import type { ILogger } from "@/shared/infrastructure/logging";

import {
  mapNotificationPayloadToCreateInput,
} from "./notification-payload.mapper";
import { resolveNotificationTemplate } from "./notification-template-resolver";
import type { INotificationService } from "./notification-service.interface";
import type {
  NotificationPayload,
  NotificationResult,
} from "./notification-types";

export interface PrismaNotificationServiceOptions {
  prisma: PrismaClient;
  logger?: ILogger;
  tx?: Prisma.TransactionClient;
}

export class PrismaNotificationService implements INotificationService {
  private readonly prisma: PrismaClient;
  private readonly logger?: ILogger;
  private readonly tx?: Prisma.TransactionClient;

  constructor(options: PrismaNotificationServiceOptions) {
    this.prisma = options.prisma;
    this.logger = options.logger;
    this.tx = options.tx;
  }

  async enqueue(payload: NotificationPayload): Promise<NotificationResult> {
    const db = resolveDbClient(this.tx);

    try {
      const result = await withPrismaError(async () => {
        const template = await resolveNotificationTemplate(db, payload.eventKey);
        const data = mapNotificationPayloadToCreateInput(payload, template);

        const notification = await db.notification.create({
          data,
          select: {
            id: true,
            createdAt: true,
          },
        });

        return {
          notificationId: notification.id,
          queuedAt: notification.createdAt,
        };
      });

      this.logger?.info("Notification enqueued", {
        notificationId: result.notificationId,
        eventKey: payload.eventKey,
        module: payload.module,
        entityName: payload.entityName,
        recordId: payload.recordId,
        recipientCount: payload.recipients.length,
      });

      return result;
    } catch (error) {
      this.logger?.error("Failed to enqueue notification", error, {
        eventKey: payload.eventKey,
        module: payload.module,
        entityName: payload.entityName,
        recordId: payload.recordId,
      });

      throw error;
    }
  }

  async cancel(notificationId: string): Promise<void> {
    const db = resolveDbClient(this.tx);

    try {
      await withPrismaError(async () => {
        await db.notification.update({
          where: { id: notificationId },
          data: {
            status: PrismaNotificationStatus.CANCELLED,
          },
        });
      });

      this.logger?.info("Notification cancelled", { notificationId });
    } catch (error) {
      this.logger?.error("Failed to cancel notification", error, {
        notificationId,
      });

      throw error;
    }
  }

  withTransaction(tx: Prisma.TransactionClient): PrismaNotificationService {
    return new PrismaNotificationService({
      prisma: this.prisma,
      logger: this.logger,
      tx,
    });
  }
}
