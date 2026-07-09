import type { Prisma } from "@/generated/prisma/client";
import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaFinancialReportRepository } from "../repositories/prisma-financial-report.repository";

export function createFinancialReportRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IFinancialReportRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "FinancialReportRepository",
  });

  return new PrismaFinancialReportRepository(runner);
}

export function createFinancialReportRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IFinancialReportRepository {
  return createFinancialReportRepository(deps, tx);
}
