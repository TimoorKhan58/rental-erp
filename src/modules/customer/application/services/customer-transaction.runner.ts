import type { ICustomerRepository } from "@/modules/customer/domain/customer.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface CustomerWriteScope {
  readonly repository: ICustomerRepository;
  readonly auditLogger: IAuditLogger;
}

export interface ICustomerTransactionRunner {
  run<T>(operation: (scope: CustomerWriteScope) => Promise<T>): Promise<T>;
}
