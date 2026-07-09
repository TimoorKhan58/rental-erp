import type { IAccountingTransactionRunner } from "@/modules/accounting/application/services/accounting-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createAccountRepositoryFromUnitOfWork } from "./create-account.repository";
import { createJournalEntryRepositoryFromUnitOfWork } from "./create-journal-entry.repository";

export interface CreateAccountingTransactionRunnerOptions {
  userId?: string;
}

export function createAccountingTransactionRunner(
  deps: SharedDeps,
  options: CreateAccountingTransactionRunnerOptions = {},
): IAccountingTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          accountRepository: createAccountRepositoryFromUnitOfWork(context),
          journalEntryRepository:
            createJournalEntryRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
