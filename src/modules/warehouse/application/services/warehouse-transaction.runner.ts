import type { IWarehouseRepository } from "@/modules/warehouse/domain/warehouse.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface WarehouseWriteScope {
  readonly repository: IWarehouseRepository;
  readonly auditLogger: IAuditLogger;
}

export interface IWarehouseTransactionRunner {
  run<T>(operation: (scope: WarehouseWriteScope) => Promise<T>): Promise<T>;
}
