import type { IBrandRepository } from "@/modules/catalog/domain/brand.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface BrandWriteScope {
  readonly repository: IBrandRepository;
  readonly auditLogger: IAuditLogger;
}

export interface IBrandTransactionRunner {
  run<T>(operation: (scope: BrandWriteScope) => Promise<T>): Promise<T>;
}
