import type { IAssetCategoryRepository } from "@/modules/asset/domain";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface CategoryWriteScope {
  readonly repository: IAssetCategoryRepository;
  readonly auditLogger: IAuditLogger;
}

export interface ICategoryTransactionRunner {
  run<T>(operation: (scope: CategoryWriteScope) => Promise<T>): Promise<T>;
}
