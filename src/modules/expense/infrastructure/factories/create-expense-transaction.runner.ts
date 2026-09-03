import { createAccountRepositoryFromUnitOfWork } from "@/modules/accounting/infrastructure/factories/create-account.repository";
import { createJournalEntryRepositoryFromUnitOfWork } from "@/modules/accounting/infrastructure/factories/create-journal-entry.repository";
import type { IExpenseTransactionRunner } from "@/modules/expense/application/services/expense-transaction.runner";
import { ExpenseAccountingHook } from "@/modules/expense/application/services/expense-accounting.hook";
import { createSupplierRepositoryFromUnitOfWork } from "@/modules/supplier/infrastructure/factories/create-supplier.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createExpenseCategoryRepositoryFromUnitOfWork } from "./create-expense-category.repository";
import { createExpenseRepositoryFromUnitOfWork } from "./create-expense.repository";

export interface CreateExpenseTransactionRunnerOptions {
  userId?: string;
}

export function createExpenseTransactionRunner(
  deps: SharedDeps,
  options: CreateExpenseTransactionRunnerOptions = {},
): IExpenseTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) => {
        const accountingHook = new ExpenseAccountingHook({
          accountRepository: createAccountRepositoryFromUnitOfWork(context),
          journalEntryRepository: createJournalEntryRepositoryFromUnitOfWork(context),
          userId: options.userId,
        });

        return operation({
          expenseRepository: createExpenseRepositoryFromUnitOfWork(context),
          expenseCategoryRepository:
            createExpenseCategoryRepositoryFromUnitOfWork(context),
          supplierRepository: createSupplierRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          accountingHook,
          notificationService: context.deps.notificationService,
          db: context.tx,
          userId: options.userId,
        });
      }),
  };
}
