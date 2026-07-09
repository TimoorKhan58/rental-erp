import type { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import type {
  IPaymentTransactionRunner,
  PaymentWriteScope,
} from "@/modules/payment/application/services/payment-transaction.runner";

import type { InMemoryPaymentRepository } from "./in-memory-payment.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: PaymentWriteScope,
): IPaymentTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  paymentRepository: InMemoryPaymentRepository,
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IPaymentTransactionRunner {
  return {
    run: async (operation) => {
      const paymentSnapshot = paymentRepository.snapshot();
      const invoiceSnapshot = rentalInvoiceRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          paymentRepository,
          rentalInvoiceRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        paymentRepository.restore(paymentSnapshot);
        rentalInvoiceRepository.restore(invoiceSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
