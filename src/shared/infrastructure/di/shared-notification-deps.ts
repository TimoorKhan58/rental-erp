import type { Prisma } from "@/generated/prisma/client";
import type { ExecutionContext } from "@/shared/application/context";
import type { INotificationService } from "@/shared/infrastructure/notifications/notification-service.interface";
import { PrismaNotificationService } from "@/shared/infrastructure/notifications/prisma-notification-service";
import type { ILogger } from "@/shared/infrastructure/logging";

import type { SharedDatabaseDeps } from "./shared-database-deps";

export interface SharedNotificationDeps {
  readonly notificationService: INotificationService;
}

export interface CreateSharedNotificationDepsOptions {
  logger?: ILogger;
  tx?: Prisma.TransactionClient;
}

export function createSharedNotificationDeps(
  databaseDeps: SharedDatabaseDeps,
  options: CreateSharedNotificationDepsOptions = {},
): SharedNotificationDeps {
  return {
    notificationService: new PrismaNotificationService({
      prisma: databaseDeps.prisma,
      logger: options.logger,
      tx: options.tx,
    }),
  };
}

export function createNotificationServiceFromExecutionContext(
  databaseDeps: SharedDatabaseDeps,
  ctx: ExecutionContext,
): INotificationService {
  return new PrismaNotificationService({
    prisma: databaseDeps.prisma,
    logger: ctx.logger,
    tx: ctx.tx,
  });
}
