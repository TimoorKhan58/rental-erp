import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface ExternalRentalWriteScope {
  readonly externalRentalRepository: IExternalRentalRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IExternalRentalTransactionRunner {
  run<T>(
    operation: (scope: ExternalRentalWriteScope) => Promise<T>,
  ): Promise<T>;
}
