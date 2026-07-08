import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ExecutionContext, RequestContext } from "@/shared/application/context";
import { appConfig } from "@/shared/config/app.config";
import type { AuditContext, IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";
import { createAuditContextFromRequest } from "@/shared/infrastructure/audit/audit-request-context";
import type { ITransactionManager } from "@/shared/infrastructure/database/transaction-manager";
import type { IFileStorage } from "@/shared/infrastructure/storage/file-storage.interface";
import type { INotificationService } from "@/shared/infrastructure/notifications/notification-service.interface";
import {
  createConsoleLogger,
  type ILogger,
} from "@/shared/infrastructure/logging";

import {
  createAuditLoggerFromExecutionContext,
  createSharedAuditDeps,
} from "./shared-audit-deps";
import { createSharedDatabaseDeps } from "./shared-database-deps";
import {
  createNotificationServiceFromExecutionContext,
  createSharedNotificationDeps,
} from "./shared-notification-deps";
import {
  createFileStorageFromExecutionContext,
  createSharedStorageDeps,
} from "./shared-storage-deps";

export interface SharedDeps {
  readonly logger: ILogger;
  readonly prisma: PrismaClient;
  readonly transactionManager: ITransactionManager;
  readonly auditLogger: IAuditLogger;
  readonly notificationService: INotificationService;
  readonly fileStorage: IFileStorage;
}

export interface CreateSharedDepsOptions {
  logger?: ILogger;
  tx?: Prisma.TransactionClient;
  auditContext?: AuditContext;
}

export function createSharedDeps(
  options: CreateSharedDepsOptions = {},
): SharedDeps {
  const logger =
    options.logger ?? createConsoleLogger({ level: appConfig.logging.level });
  const databaseDeps = createSharedDatabaseDeps();
  const auditDeps = createSharedAuditDeps(databaseDeps, {
    logger,
    auditContext: options.auditContext,
    tx: options.tx,
  });
  const notificationDeps = createSharedNotificationDeps(databaseDeps, {
    logger,
    tx: options.tx,
  });
  const storageDeps = createSharedStorageDeps({ logger });

  return {
    logger,
    prisma: databaseDeps.prisma,
    transactionManager: databaseDeps.transactionManager,
    auditLogger: auditDeps.auditLogger,
    notificationService: notificationDeps.notificationService,
    fileStorage: storageDeps.fileStorage,
  };
}

export interface CreateSharedDepsFromRequestContextOptions {
  tx?: Prisma.TransactionClient;
  auditContext?: AuditContext;
}

export function createSharedDepsFromRequestContext(
  request: RequestContext,
  logger: ILogger,
  options: CreateSharedDepsFromRequestContextOptions = {},
): SharedDeps {
  return createSharedDeps({
    logger,
    tx: options.tx,
    auditContext:
      options.auditContext ?? createAuditContextFromRequest(request),
  });
}

export function createSharedDepsFromExecutionContext(
  ctx: ExecutionContext,
): SharedDeps {
  const databaseDeps = createSharedDatabaseDeps();

  return {
    logger: ctx.logger,
    prisma: databaseDeps.prisma,
    transactionManager: databaseDeps.transactionManager,
    auditLogger: createAuditLoggerFromExecutionContext(databaseDeps, ctx),
    notificationService: createNotificationServiceFromExecutionContext(
      databaseDeps,
      ctx,
    ),
    fileStorage: createFileStorageFromExecutionContext(ctx),
  };
}

export function createTransactionScopedSharedDeps(
  base: Pick<SharedDeps, "logger"> & { auditContext?: AuditContext },
  tx: Prisma.TransactionClient,
): SharedDeps {
  return createSharedDeps({
    logger: base.logger,
    tx,
    auditContext: base.auditContext,
  });
}

export async function runWithTransactionScopedSharedDeps<T>(
  deps: SharedDeps,
  operation: (
    transactionDeps: SharedDeps,
    tx: Prisma.TransactionClient,
  ) => Promise<T>,
  auditContext?: AuditContext,
): Promise<T> {
  return deps.transactionManager.run(async (tx) => {
    const transactionDeps = createTransactionScopedSharedDeps(
      { logger: deps.logger, auditContext },
      tx,
    );

    return operation(transactionDeps, tx);
  });
}

export async function runWithSharedTransaction<T>(
  deps: SharedDeps,
  operation: (deps: SharedDeps) => Promise<T>,
  auditContext?: AuditContext,
): Promise<T> {
  return runWithTransactionScopedSharedDeps(
    deps,
    (transactionDeps) => operation(transactionDeps),
    auditContext,
  );
}
