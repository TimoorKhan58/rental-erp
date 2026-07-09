import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface InventoryWriteScope {
  readonly repository: IInventoryRepository;
  readonly auditLogger: IAuditLogger;
}

export interface IInventoryTransactionRunner {
  run<T>(operation: (scope: InventoryWriteScope) => Promise<T>): Promise<T>;
}
