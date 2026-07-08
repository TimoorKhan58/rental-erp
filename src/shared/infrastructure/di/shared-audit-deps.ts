import type { Prisma } from "@/generated/prisma/client";
import type { ExecutionContext } from "@/shared/application/context";
import { createAuditContextFromRequest } from "@/shared/infrastructure/audit/audit-request-context";
import type { AuditContext, IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";
import { PrismaAuditLogger } from "@/shared/infrastructure/audit/prisma-audit-logger";
import type { ILogger } from "@/shared/infrastructure/logging";

import type { SharedDatabaseDeps } from "./shared-database-deps";

export interface SharedAuditDeps {
  readonly auditLogger: IAuditLogger;
}

export interface CreateSharedAuditDepsOptions {
  logger?: ILogger;
  auditContext?: AuditContext;
  tx?: Prisma.TransactionClient;
}

export function createSharedAuditDeps(
  databaseDeps: SharedDatabaseDeps,
  options: CreateSharedAuditDepsOptions = {},
): SharedAuditDeps {
  return {
    auditLogger: new PrismaAuditLogger({
      prisma: databaseDeps.prisma,
      logger: options.logger,
      defaultContext: options.auditContext,
      tx: options.tx,
    }),
  };
}

export function createAuditLoggerFromExecutionContext(
  databaseDeps: SharedDatabaseDeps,
  ctx: ExecutionContext,
): IAuditLogger {
  return new PrismaAuditLogger({
    prisma: databaseDeps.prisma,
    logger: ctx.logger,
    defaultContext: createAuditContextFromRequest(ctx.request),
    tx: ctx.tx,
  });
}
