import type { IUnitRepository } from "@/modules/catalog/domain/unit.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface UnitWriteScope {
  readonly repository: IUnitRepository;
  readonly auditLogger: IAuditLogger;
}

export interface IUnitTransactionRunner {
  run<T>(operation: (scope: UnitWriteScope) => Promise<T>): Promise<T>;
}
