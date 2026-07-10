import type { IExpenseCategoryRepository } from "@/modules/expense/domain/expense-category.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface CategoryWriteScope {
  readonly repository: IExpenseCategoryRepository;
  readonly auditLogger: IAuditLogger;
}

export interface ICategoryTransactionRunner {
  run<T>(operation: (scope: CategoryWriteScope) => Promise<T>): Promise<T>;
}
