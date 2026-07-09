import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface SupplierWriteScope {
  readonly repository: ISupplierRepository;
  readonly auditLogger: IAuditLogger;
}

export interface ISupplierTransactionRunner {
  run<T>(operation: (scope: SupplierWriteScope) => Promise<T>): Promise<T>;
}
