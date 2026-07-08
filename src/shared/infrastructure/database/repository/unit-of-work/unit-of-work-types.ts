import type { Prisma } from "@/generated/prisma/client";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import type { PrismaRepositoryBase } from "../prisma-repository-base";
import type { RepositoryRunner } from "../repository-runner";

export interface RepositoryUnitOfWorkContext {
  readonly tx: Prisma.TransactionClient;
  readonly deps: SharedDeps;
  readonly runner: RepositoryRunner;
  readonly repositoryBase: PrismaRepositoryBase;
  createRunner(): RepositoryRunner;
  createRepositoryBase(): PrismaRepositoryBase;
}

export interface IUnitOfWork {
  run<T>(
    operation: (context: RepositoryUnitOfWorkContext) => Promise<T>,
  ): Promise<T>;
}

export type UnitOfWorkRepositoryFactory<TRepositories> = (
  context: RepositoryUnitOfWorkContext,
) => TRepositories;

export type UnitOfWorkOperation<TRepositories, TResult> = (
  repositories: TRepositories,
  context: RepositoryUnitOfWorkContext,
) => Promise<TResult>;
