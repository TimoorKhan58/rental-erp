import type {
  ExternalRentalWriteScope,
  IExternalRentalTransactionRunner,
} from "@/modules/external-rental/application/services/external-rental-transaction.runner";

import type { InMemoryExternalRentalRepository } from "./in-memory-external-rental.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughExternalRentalTransactionRunner(
  scope: ExternalRentalWriteScope,
): IExternalRentalTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackExternalRentalTransactionRunner(
  externalRentalRepository: InMemoryExternalRentalRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
): IExternalRentalTransactionRunner {
  return {
    run: async (operation) => {
      const rentalSnapshot = externalRentalRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          externalRentalRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        externalRentalRepository.restore(rentalSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
