import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface NumberSequenceWriteScope {
  readonly numberSequenceRepository: INumberSequenceRepository;
  readonly auditLogger: IAuditLogger;
}

export interface INumberSequenceTransactionRunner {
  run<T>(
    operation: (scope: NumberSequenceWriteScope) => Promise<T>,
  ): Promise<T>;
}
