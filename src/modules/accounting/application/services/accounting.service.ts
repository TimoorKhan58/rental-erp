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
import type { IAccountingService } from "./accounting-application-services.interface";
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

export class AccountingService implements IAccountingService {
  constructor(
    private readonly getAccountByIdService: GetAccountByIdService,
    private readonly listAccountsService: ListAccountsService,
    private readonly createAccountService: CreateAccountService,
    private readonly updateAccountService: UpdateAccountService,
    private readonly getJournalEntryByIdService: GetJournalEntryByIdService,
    private readonly listJournalEntriesService: ListJournalEntriesService,
    private readonly createJournalEntryService: CreateJournalEntryService,
    private readonly updateJournalEntryService: UpdateJournalEntryService,
    private readonly postJournalEntryService: PostJournalEntryService,
    private readonly voidJournalEntryService: VoidJournalEntryService,
  ) {}

  getAccountById(params: AccountIdParamInput): Promise<AccountDto> {
    return this.getAccountByIdService.execute(params);
  }

  listAccounts(input: ListAccountsInput): Promise<PaginatedResult<AccountDto>> {
    return this.listAccountsService.execute(input);
  }

  createAccount(input: CreateAccountInput): Promise<AccountDto> {
    return this.createAccountService.execute(input);
  }

  updateAccount(
    params: AccountIdParamInput,
    input: UpdateAccountInput,
  ): Promise<AccountDto> {
    return this.updateAccountService.execute(params, input);
  }

  getJournalEntryById(
    params: JournalEntryIdParamInput,
  ): Promise<JournalEntryDto> {
    return this.getJournalEntryByIdService.execute(params);
  }

  listJournalEntries(
    input: ListJournalEntriesInput,
  ): Promise<PaginatedResult<JournalEntryDto>> {
    return this.listJournalEntriesService.execute(input);
  }

  createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntryDto> {
    return this.createJournalEntryService.execute(input);
  }

  updateJournalEntry(
    params: JournalEntryIdParamInput,
    input: UpdateJournalEntryInput,
  ): Promise<JournalEntryDto> {
    return this.updateJournalEntryService.execute(params, input);
  }

  postJournalEntry(params: JournalEntryIdParamInput): Promise<JournalEntryDto> {
    return this.postJournalEntryService.execute(params);
  }

  voidJournalEntry(params: JournalEntryIdParamInput): Promise<JournalEntryDto> {
    return this.voidJournalEntryService.execute(params);
  }
}
