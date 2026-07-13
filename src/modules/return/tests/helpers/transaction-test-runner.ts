import type { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryPaymentRepository } from "@/modules/payment/tests/helpers/in-memory-payment.repository";
import type { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import type { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import type {
  IReturnTransactionRunner,
  ReturnWriteScope,
} from "@/modules/return/application/services/return-transaction.runner";

import type { InMemoryReturnRepository } from "./in-memory-return.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: ReturnWriteScope,
): IReturnTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  returnRepository: InMemoryReturnRepository,
  dispatchRepository: InMemoryDispatchRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  paymentRepository: InMemoryPaymentRepository,
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IReturnTransactionRunner {
  return {
    run: async (operation) => {
      const returnSnapshot = returnRepository.snapshot();
      const dispatchSnapshot = dispatchRepository.snapshot();
      const rentalOrderSnapshot = rentalOrderRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const paymentSnapshot = paymentRepository.snapshot();
      const rentalInvoiceSnapshot = rentalInvoiceRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          returnRepository,
          dispatchRepository,
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          paymentRepository,
          rentalInvoiceRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        returnRepository.restore(returnSnapshot);
        dispatchRepository.restore(dispatchSnapshot);
        rentalOrderRepository.restore(rentalOrderSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        paymentRepository.restore(paymentSnapshot);
        rentalInvoiceRepository.restore(rentalInvoiceSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
