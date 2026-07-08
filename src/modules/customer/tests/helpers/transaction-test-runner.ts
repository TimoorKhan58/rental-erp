import type { CustomerWriteScope } from "@/modules/customer/application/services/customer-transaction.runner";
import type { ICustomerTransactionRunner } from "@/modules/customer/application/services/customer-transaction.runner";

import type { InMemoryCustomerRepository } from "./in-memory-customer.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: CustomerWriteScope,
): ICustomerTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  repository: InMemoryCustomerRepository,
  auditLogger: MockAuditLogger,
): ICustomerTransactionRunner {
  return {
    run: async (operation) => {
      const repositorySnapshot = repository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({ repository, auditLogger });
      } catch (error) {
        repository.restore(repositorySnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
