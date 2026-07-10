import type { IExpenseCategoryRepository } from "@/modules/expense/domain/expense-category.repository.interface";
import type { IExpenseRepository } from "@/modules/expense/domain/expense.repository.interface";
import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

import type { IExpenseAccountingHook } from "./expense-accounting.hook";

export interface ExpenseWriteScope {
  readonly expenseRepository: IExpenseRepository;
  readonly expenseCategoryRepository: IExpenseCategoryRepository;
  readonly supplierRepository: ISupplierRepository | undefined;
  readonly auditLogger: IAuditLogger;
  readonly accountingHook: IExpenseAccountingHook;
  readonly userId: string | undefined;
}

export interface IExpenseTransactionRunner {
  run<T>(operation: (scope: ExpenseWriteScope) => Promise<T>): Promise<T>;
}
