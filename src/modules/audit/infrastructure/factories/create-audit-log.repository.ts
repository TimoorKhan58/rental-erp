import type { Prisma } from "@/generated/prisma/client";
import type { IAuditLogRepository } from "@/modules/audit/domain/audit-log.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaAuditLogRepository } from "../repositories/prisma-audit-log.repository";

export function createAuditLogRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IAuditLogRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "AuditLogRepository",
  });

  return new PrismaAuditLogRepository(runner);
}

export function createAuditLogRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IAuditLogRepository {
  return createAuditLogRepository(deps, tx);
}
