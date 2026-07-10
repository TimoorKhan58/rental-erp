import type { IBrandRepository } from "@/modules/catalog/domain/brand.repository.interface";
import type { ICategoryRepository } from "@/modules/catalog/domain/category.repository.interface";
import type { IUnitRepository } from "@/modules/catalog/domain/unit.repository.interface";
import type { IProductRepository } from "@/modules/product/domain/product.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface ProductWriteScope {
  readonly repository: IProductRepository;
  readonly categoryRepository: ICategoryRepository;
  readonly brandRepository: IBrandRepository;
  readonly unitRepository: IUnitRepository;
  readonly auditLogger: IAuditLogger;
}

export interface IProductTransactionRunner {
  run<T>(operation: (scope: ProductWriteScope) => Promise<T>): Promise<T>;
}
