import type { InMemoryPurchaseOrderRepository } from "@/modules/procurement/tests/helpers/in-memory-purchase-order.repository";
import type {
  ISupplierPaymentTransactionRunner,
  SupplierPaymentWriteScope,
} from "@/modules/supplier-payment/application/services/supplier-payment-transaction.runner";

import type { InMemorySupplierPaymentRepository } from "./in-memory-supplier-payment.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: SupplierPaymentWriteScope,
): ISupplierPaymentTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  supplierPaymentRepository: InMemorySupplierPaymentRepository,
  purchaseOrderRepository: InMemoryPurchaseOrderRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): ISupplierPaymentTransactionRunner {
  return {
    run: async (operation) => {
      const paymentSnapshot = supplierPaymentRepository.snapshot();
      const purchaseOrderSnapshot = purchaseOrderRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          supplierPaymentRepository,
          purchaseOrderRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        supplierPaymentRepository.restore(paymentSnapshot);
        purchaseOrderRepository.restore(purchaseOrderSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
