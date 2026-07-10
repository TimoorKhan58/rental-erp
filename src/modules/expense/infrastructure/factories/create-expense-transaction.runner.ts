import type { IExpenseTransactionRunner } from "@/modules/expense/application/services/expense-transaction.runner";
import { NoOpExpenseAccountingHook } from "@/modules/expense/application/services/expense-accounting.hook";
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
  const accountingHook = new NoOpExpenseAccountingHook();

  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          expenseRepository: createExpenseRepositoryFromUnitOfWork(context),
          expenseCategoryRepository:
            createExpenseCategoryRepositoryFromUnitOfWork(context),
          supplierRepository: createSupplierRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          accountingHook,
          userId: options.userId,
        }),
      ),
  };
}
