import type { Prisma } from "@/generated/prisma/client";
import type { INotificationRepository } from "@/modules/notification/domain/notification.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaNotificationRepository } from "../repositories/prisma-notification.repository";

export function createNotificationRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): INotificationRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "NotificationRepository",
  });

  return new PrismaNotificationRepository(runner);
}

export function createNotificationRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): INotificationRepository {
  return createNotificationRepository(deps, tx);
}
