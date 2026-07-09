import type { Prisma } from "@/generated/prisma/client";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaJournalEntryRepository } from "../repositories/prisma-journal-entry.repository";

export function createJournalEntryRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IJournalEntryRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "JournalEntryRepository",
  });

  return new PrismaJournalEntryRepository(runner);
}

export function createJournalEntryRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IJournalEntryRepository {
  return createJournalEntryRepository(context.deps, context.tx);
}

export function createJournalEntryRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IJournalEntryRepository {
  return createJournalEntryRepository(deps, tx);
}
