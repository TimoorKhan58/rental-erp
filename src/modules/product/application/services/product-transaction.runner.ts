import type { IProductRepository } from "@/modules/product/domain/product.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface ProductWriteScope {
  readonly repository: IProductRepository;
  readonly auditLogger: IAuditLogger;
}

export interface IProductTransactionRunner {
  run<T>(operation: (scope: ProductWriteScope) => Promise<T>): Promise<T>;
}
