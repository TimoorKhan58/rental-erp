import type { ICategoryRepository } from "@/modules/catalog/domain/category.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface CategoryWriteScope {
  readonly repository: ICategoryRepository;
  readonly auditLogger: IAuditLogger;
}

export interface ICategoryTransactionRunner {
  run<T>(operation: (scope: CategoryWriteScope) => Promise<T>): Promise<T>;
}
