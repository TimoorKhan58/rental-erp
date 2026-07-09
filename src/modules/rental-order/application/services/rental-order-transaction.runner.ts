import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface RentalOrderWriteScope {
  readonly rentalOrderRepository: IRentalOrderRepository;
  readonly inventoryRepository: IInventoryRepository;
  readonly stockMovementRepository: IStockMovementRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IRentalOrderTransactionRunner {
  run<T>(operation: (scope: RentalOrderWriteScope) => Promise<T>): Promise<T>;
}
