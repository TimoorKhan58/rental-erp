import type { Account } from "@/modules/accounting/domain/account.entity";
import type { AccountListQuery } from "@/modules/accounting/domain/account-list.query";
import type {
  CreateAccountData,
  UpdateAccountData,
} from "@/modules/accounting/domain/account.types";
import type { AccountId } from "@/shared/domain/ids";

import type { AccountDto } from "../dtos/account.dto";
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "../schemas/account.schemas";
import type { ListAccountsInput } from "../schemas/list-accounts.schema";

export function toAccountDto(account: Account): AccountDto {
  const props = account.toProps();

  return {
    id: props.id,
    accountCode: props.accountCode,
    name: props.name,
    accountType: props.accountType,
    description: props.description,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateAccountData(input: CreateAccountInput): CreateAccountData {
  return {
    accountCode: input.accountCode,
    name: input.name,
    accountType: input.accountType,
    description: input.description ?? null,
    isActive: input.isActive,
  };
}

export function toUpdateAccountData(input: UpdateAccountInput): UpdateAccountData {
  return {
    name: input.name,
    accountType: input.accountType,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toAccountId(id: string): AccountId {
  return id as AccountId;
}

export function toAccountListQuery(input: ListAccountsInput): AccountListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    accountType: input.accountType,
    isActive: input.isActive,
  };
}
