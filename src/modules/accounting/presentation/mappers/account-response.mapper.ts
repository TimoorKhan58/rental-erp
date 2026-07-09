import type { AccountDto } from "@/modules/accounting/application/dtos/account.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface AccountResponse {
  id: string;
  accountCode: string;
  name: string;
  accountType: AccountDto["accountType"];
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountListResponse {
  items: AccountResponse[];
  meta: PaginationMeta;
}

export function toAccountResponse(dto: AccountDto): AccountResponse {
  return {
    id: dto.id,
    accountCode: dto.accountCode,
    name: dto.name,
    accountType: dto.accountType,
    description: dto.description,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toAccountListResponse(
  result: PaginatedResult<AccountDto>,
): AccountListResponse {
  return {
    items: result.items.map(toAccountResponse),
    meta: result.meta,
  };
}
