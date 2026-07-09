import type {
  IAccountingTransactionRunner,
  AccountingWriteScope,
} from "@/modules/accounting/application/services/accounting-transaction.runner";

import type { InMemoryAccountRepository } from "./in-memory-account.repository";
import type { InMemoryJournalEntryRepository } from "./in-memory-journal-entry.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: AccountingWriteScope,
): IAccountingTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  accountRepository: InMemoryAccountRepository,
  journalEntryRepository: InMemoryJournalEntryRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IAccountingTransactionRunner {
  return {
    run: async (operation) => {
      const accountSnapshot = accountRepository.snapshot();
      const journalSnapshot = journalEntryRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          accountRepository,
          journalEntryRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        accountRepository.restore(accountSnapshot);
        journalEntryRepository.restore(journalSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
