import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface PurchaseOrderWriteScope {
  readonly purchaseOrderRepository: IPurchaseOrderRepository;
  readonly inventoryRepository: IInventoryRepository;
  readonly stockMovementRepository: IStockMovementRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IPurchaseOrderTransactionRunner {
  run<T>(
    operation: (scope: PurchaseOrderWriteScope) => Promise<T>,
  ): Promise<T>;
}
