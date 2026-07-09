import type { AccountingApplicationServices as AccountingApplicationServicesBase } from "@/modules/accounting/application/services/accounting-application-services.interface";
import { AccountingService } from "@/modules/accounting/application/services/accounting.service";
import type { IAccountingService } from "@/modules/accounting/application/services/accounting-application-services.interface";
import { CreateAccountService } from "@/modules/accounting/application/services/create-account.service";
import { CreateJournalEntryService } from "@/modules/accounting/application/services/create-journal-entry.service";
import { GetAccountByIdService } from "@/modules/accounting/application/services/get-account-by-id.service";
import { GetJournalEntryByIdService } from "@/modules/accounting/application/services/get-journal-entry-by-id.service";
import { ListAccountsService } from "@/modules/accounting/application/services/list-accounts.service";
import { ListJournalEntriesService } from "@/modules/accounting/application/services/list-journal-entries.service";
import { PostJournalEntryService } from "@/modules/accounting/application/services/post-journal-entry.service";
import { UpdateAccountService } from "@/modules/accounting/application/services/update-account.service";
import { UpdateJournalEntryService } from "@/modules/accounting/application/services/update-journal-entry.service";
import { VoidJournalEntryService } from "@/modules/accounting/application/services/void-journal-entry.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createAccountRepositoryFromSharedDeps } from "./create-account.repository";
import { createAccountingTransactionRunner } from "./create-accounting-transaction.runner";
import { createJournalEntryRepositoryFromSharedDeps } from "./create-journal-entry.repository";

export type { AccountingApplicationServicesBase as AccountingApplicationServices };

export interface WiredAccountingApplicationServices
  extends AccountingApplicationServicesBase {
  accountingService: IAccountingService;
}

export function createAccountingApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredAccountingApplicationServices {
  const accountRepository = createAccountRepositoryFromSharedDeps(deps);
  const journalEntryRepository =
    createJournalEntryRepositoryFromSharedDeps(deps);
  const transactionRunner = createAccountingTransactionRunner(deps, { userId });

  const getAccountById = new GetAccountByIdService(accountRepository);
  const listAccounts = new ListAccountsService(accountRepository);
  const createAccount = new CreateAccountService(transactionRunner);
  const updateAccount = new UpdateAccountService(transactionRunner);
  const getJournalEntryById = new GetJournalEntryByIdService(
    journalEntryRepository,
  );
  const listJournalEntries = new ListJournalEntriesService(
    journalEntryRepository,
  );
  const createJournalEntry = new CreateJournalEntryService(transactionRunner);
  const updateJournalEntry = new UpdateJournalEntryService(transactionRunner);
  const postJournalEntry = new PostJournalEntryService(transactionRunner);
  const voidJournalEntry = new VoidJournalEntryService(transactionRunner);

  return {
    getAccountById,
    listAccounts,
    createAccount,
    updateAccount,
    getJournalEntryById,
    listJournalEntries,
    createJournalEntry,
    updateJournalEntry,
    postJournalEntry,
    voidJournalEntry,
    accountingService: new AccountingService(
      getAccountById,
      listAccounts,
      createAccount,
      updateAccount,
      getJournalEntryById,
      listJournalEntries,
      createJournalEntry,
      updateJournalEntry,
      postJournalEntry,
      voidJournalEntry,
    ),
  };
}
