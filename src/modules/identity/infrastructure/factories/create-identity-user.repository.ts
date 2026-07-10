import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { Prisma } from "@/generated/prisma/client";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaIdentityUserRepository } from "../repositories/prisma-identity-user.repository";
import { PrismaRoleRepository } from "../repositories/prisma-identity-user.repository";

export function createIdentityUserRepository(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): PrismaIdentityUserRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "IdentityUserRepository",
  });

  return new PrismaIdentityUserRepository(runner);
}

export function createRoleRepository(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): PrismaRoleRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "RoleRepository",
  });

  return new PrismaRoleRepository(runner);
}

export function createIdentityUserRepositoryFromSharedDeps(
  deps: SharedDeps,
): PrismaIdentityUserRepository {
  return createIdentityUserRepository(deps);
}

export function createRoleRepositoryFromSharedDeps(
  deps: SharedDeps,
): PrismaRoleRepository {
  return createRoleRepository(deps);
}

export function createIdentityUserRepositoryFromUnitOfWork(context: {
  deps: SharedDeps;
  tx: Prisma.TransactionClient;
}): PrismaIdentityUserRepository {
  return createIdentityUserRepository(context.deps, context.tx);
}

export function createRoleRepositoryFromUnitOfWork(context: {
  deps: SharedDeps;
  tx: Prisma.TransactionClient;
}): PrismaRoleRepository {
  return createRoleRepository(context.deps, context.tx);
}
