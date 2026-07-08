import type { ExecutionContext } from "@/shared/application/context";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import {
  createPrismaRepositoryBase,
  type PrismaRepositoryBase,
} from "./prisma-repository-base";
import {
  createRepositoryRunner,
  type RepositoryRunner,
} from "./repository-runner";
import type {
  RepositoryBaseOptions,
  RepositoryExecutionContext,
  RepositoryFactoryOptions,
} from "./repository-types";

export function createRepositoryBase(
  options: RepositoryFactoryOptions,
): PrismaRepositoryBase {
  return createPrismaRepositoryBase(options);
}

export function createRepositoryRunnerFromOptions(
  options: RepositoryFactoryOptions,
): RepositoryRunner {
  return createRepositoryRunner(options);
}

export function createRepositoryBaseFromSharedDeps(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: RepositoryBaseOptions["tx"],
): PrismaRepositoryBase {
  return createRepositoryBase({
    prisma: deps.prisma,
    logger: deps.logger,
    tx,
  });
}

export function createRepositoryRunnerFromSharedDeps(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: RepositoryBaseOptions["tx"],
): RepositoryRunner {
  return createRepositoryRunner({
    prisma: deps.prisma,
    logger: deps.logger,
    tx,
  });
}

export function createRepositoryBaseFromExecutionContext(
  deps: Pick<SharedDeps, "prisma">,
  ctx: RepositoryExecutionContext,
): PrismaRepositoryBase {
  return createRepositoryBase({
    prisma: deps.prisma,
    logger: ctx.logger,
    tx: ctx.tx,
  });
}

export function createRepositoryRunnerFromExecutionContext(
  deps: Pick<SharedDeps, "prisma">,
  ctx: RepositoryExecutionContext,
): RepositoryRunner {
  return createRepositoryRunner({
    prisma: deps.prisma,
    logger: ctx.logger,
    tx: ctx.tx,
  });
}

export function createRepositoryBaseFromFullExecutionContext(
  ctx: ExecutionContext,
  prisma: SharedDeps["prisma"],
): PrismaRepositoryBase {
  return createRepositoryBaseFromExecutionContext({ prisma }, ctx);
}
