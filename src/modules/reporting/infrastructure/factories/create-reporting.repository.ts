import type { Prisma } from "@/generated/prisma/client";
import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaReportingRepository } from "../repositories/prisma-reporting.repository";

export function createReportingRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IReportingRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "ReportingRepository",
  });

  return new PrismaReportingRepository(runner);
}

export function createReportingRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IReportingRepository {
  return createReportingRepository(deps, tx);
}
