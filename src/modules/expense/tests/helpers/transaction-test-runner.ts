import type {
  ExpenseWriteScope,
  IExpenseTransactionRunner,
} from "@/modules/expense/application/services/expense-transaction.runner";
import type { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import type { InMemoryExpenseRepository } from "./in-memory-expense.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: ExpenseWriteScope,
): IExpenseTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  expenseRepository: InMemoryExpenseRepository,
  journalEntryRepository: InMemoryJournalEntryRepository,
  auditLogger: MockAuditLogger,
  buildScope: (
    expenseRepository: InMemoryExpenseRepository,
    journalEntryRepository: InMemoryJournalEntryRepository,
    auditLogger: MockAuditLogger,
  ) => ExpenseWriteScope,
): IExpenseTransactionRunner {
  return {
    run: async (operation) => {
      const expenseSnapshot = expenseRepository.snapshot();
      const journalSnapshot = journalEntryRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation(
          buildScope(expenseRepository, journalEntryRepository, auditLogger),
        );
      } catch (error) {
        expenseRepository.restore(expenseSnapshot);
        journalEntryRepository.restore(journalSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}

export function createMinimalExpenseWriteScope(
  expenseRepository: InMemoryExpenseRepository,
  auditLogger: MockAuditLogger,
  accountingHook: ExpenseWriteScope["accountingHook"],
  userId: string | undefined,
): ExpenseWriteScope {
  return {
    expenseRepository,
    expenseCategoryRepository: {
      findById: async () => null,
      findPaged: async () => ({
        items: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      }),
      create: async () => {
        throw new Error("Not implemented");
      },
      update: async () => {
        throw new Error("Not implemented");
      },
      delete: async () => {
        throw new Error("Not implemented");
      },
    },
    supplierRepository: undefined,
    auditLogger,
    accountingHook,
    ...mockNotificationWriteScopeDeps,
    db: {} as ExpenseWriteScope["db"],
    userId,
  };
}
