import type { IDashboardLayoutRepository } from "@/modules/dashboard/domain/dashboard.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface DashboardWriteScope {
  readonly repository: IDashboardLayoutRepository;
  readonly auditLogger: IAuditLogger;
}

export interface IDashboardTransactionRunner {
  run<T>(operation: (scope: DashboardWriteScope) => Promise<T>): Promise<T>;
}
