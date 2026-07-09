import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AccountDto } from "../dtos/account.dto";
import type { JournalEntryDto } from "../dtos/journal-entry.dto";
import type {
  CreateAccountInput,
  AccountIdParamInput,
  UpdateAccountInput,
} from "../schemas/account.schemas";
import type { ListAccountsInput } from "../schemas/list-accounts.schema";
import type {
  CreateJournalEntryInput,
  JournalEntryIdParamInput,
  UpdateJournalEntryInput,
} from "../schemas/journal-entry.schemas";
import type { ListJournalEntriesInput } from "../schemas/list-journal-entries.schema";
import type { CreateAccountService } from "./create-account.service";
import type { CreateJournalEntryService } from "./create-journal-entry.service";
import type { GetAccountByIdService } from "./get-account-by-id.service";
import type { GetJournalEntryByIdService } from "./get-journal-entry-by-id.service";
import type { ListAccountsService } from "./list-accounts.service";
import type { ListJournalEntriesService } from "./list-journal-entries.service";
import type { PostJournalEntryService } from "./post-journal-entry.service";
import type { UpdateAccountService } from "./update-account.service";
import type { UpdateJournalEntryService } from "./update-journal-entry.service";
import type { VoidJournalEntryService } from "./void-journal-entry.service";

export interface AccountingApplicationServices {
  getAccountById: GetAccountByIdService;
  listAccounts: ListAccountsService;
  createAccount: CreateAccountService;
  updateAccount: UpdateAccountService;
  getJournalEntryById: GetJournalEntryByIdService;
  listJournalEntries: ListJournalEntriesService;
  createJournalEntry: CreateJournalEntryService;
  updateJournalEntry: UpdateJournalEntryService;
  postJournalEntry: PostJournalEntryService;
  voidJournalEntry: VoidJournalEntryService;
}

export type AccountingServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => AccountingApplicationServices;

export interface IAccountingService {
  getAccountById(params: AccountIdParamInput): Promise<AccountDto>;
  listAccounts(input: ListAccountsInput): Promise<PaginatedResult<AccountDto>>;
  createAccount(input: CreateAccountInput): Promise<AccountDto>;
  updateAccount(
    params: AccountIdParamInput,
    input: UpdateAccountInput,
  ): Promise<AccountDto>;
  getJournalEntryById(params: JournalEntryIdParamInput): Promise<JournalEntryDto>;
  listJournalEntries(
    input: ListJournalEntriesInput,
  ): Promise<PaginatedResult<JournalEntryDto>>;
  createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntryDto>;
  updateJournalEntry(
    params: JournalEntryIdParamInput,
    input: UpdateJournalEntryInput,
  ): Promise<JournalEntryDto>;
  postJournalEntry(params: JournalEntryIdParamInput): Promise<JournalEntryDto>;
  voidJournalEntry(params: JournalEntryIdParamInput): Promise<JournalEntryDto>;
}
