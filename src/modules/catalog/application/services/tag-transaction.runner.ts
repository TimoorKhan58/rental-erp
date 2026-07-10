import type { ITagRepository } from "@/modules/catalog/domain/tag.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface TagWriteScope {
  readonly repository: ITagRepository;
  readonly auditLogger: IAuditLogger;
}

export interface ITagTransactionRunner {
  run<T>(operation: (scope: TagWriteScope) => Promise<T>): Promise<T>;
}
