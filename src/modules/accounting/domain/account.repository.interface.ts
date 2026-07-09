import type { AccountId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Account } from "./account.entity";
import type { AccountListQuery } from "./account-list.query";
import type { CreateAccountData, UpdateAccountData } from "./account.types";

export interface IAccountRepository {
  findById(id: AccountId): Promise<Account | null>;
  findByAccountCode(accountCode: string): Promise<Account | null>;
  findPaged(query: AccountListQuery): Promise<PaginatedResult<Account>>;
  create(data: CreateAccountData): Promise<Account>;
  update(id: AccountId, data: UpdateAccountData): Promise<Account>;
}
