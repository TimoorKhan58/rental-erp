import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface StockMovementWriteScope {
  readonly stockMovementRepository: IStockMovementRepository;
  readonly inventoryRepository: IInventoryRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IStockMovementTransactionRunner {
  run<T>(
    operation: (scope: StockMovementWriteScope) => Promise<T>,
  ): Promise<T>;
}
