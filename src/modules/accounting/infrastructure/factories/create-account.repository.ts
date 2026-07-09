import type { Prisma } from "@/generated/prisma/client";
import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaAccountRepository } from "../repositories/prisma-account.repository";

export function createAccountRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IAccountRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "AccountRepository",
  });

  return new PrismaAccountRepository(runner);
}

export function createAccountRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IAccountRepository {
  return createAccountRepository(context.deps, context.tx);
}

export function createAccountRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IAccountRepository {
  return createAccountRepository(deps, tx);
}
