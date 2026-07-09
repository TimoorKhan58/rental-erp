import type { IReturnRepository } from "@/modules/return/domain";
import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface ReturnWriteScope {
  readonly returnRepository: IReturnRepository;
  readonly dispatchRepository: IDispatchRepository;
  readonly rentalOrderRepository: IRentalOrderRepository;
  readonly inventoryRepository: IInventoryRepository;
  readonly stockMovementRepository: IStockMovementRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IReturnTransactionRunner {
  run<T>(operation: (scope: ReturnWriteScope) => Promise<T>): Promise<T>;
}
