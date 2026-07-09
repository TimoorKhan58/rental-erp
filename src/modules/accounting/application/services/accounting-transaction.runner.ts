import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface AccountingWriteScope {
  readonly accountRepository: IAccountRepository;
  readonly journalEntryRepository: IJournalEntryRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IAccountingTransactionRunner {
  run<T>(operation: (scope: AccountingWriteScope) => Promise<T>): Promise<T>;
}
