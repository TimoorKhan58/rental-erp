import type { IAttributeRepository } from "@/modules/catalog/domain/attribute.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface AttributeWriteScope {
  readonly repository: IAttributeRepository;
  readonly auditLogger: IAuditLogger;
}

export interface IAttributeTransactionRunner {
  run<T>(operation: (scope: AttributeWriteScope) => Promise<T>): Promise<T>;
}
