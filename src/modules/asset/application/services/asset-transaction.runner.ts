import type { IAssetRepository } from "@/modules/asset/domain";
import type { IAssetCategoryRepository } from "@/modules/asset/domain";
import type { IWarehouseRepository } from "@/modules/warehouse/domain/warehouse.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface AssetWriteScope {
  readonly assetRepository: IAssetRepository;
  readonly categoryRepository: IAssetCategoryRepository;
  readonly warehouseRepository: IWarehouseRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IAssetTransactionRunner {
  run<T>(operation: (scope: AssetWriteScope) => Promise<T>): Promise<T>;
}
