import type { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import type {
  IRentalInvoiceTransactionRunner,
  RentalInvoiceWriteScope,
} from "@/modules/rental-invoice/application/services/rental-invoice-transaction.runner";

import type { InMemoryRentalInvoiceRepository } from "./in-memory-rental-invoice.repository";
import type { InMemoryRentalOrderInvoiceLookup } from "./in-memory-rental-order-invoice.lookup";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: RentalInvoiceWriteScope,
): IRentalInvoiceTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  rentalOrderInvoiceLookup: InMemoryRentalOrderInvoiceLookup,
  customerRepository: InMemoryCustomerRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IRentalInvoiceTransactionRunner {
  return {
    run: async (operation) => {
      const invoiceSnapshot = rentalInvoiceRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          rentalInvoiceRepository,
          rentalOrderInvoiceLookup,
          customerRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        rentalInvoiceRepository.restore(invoiceSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
