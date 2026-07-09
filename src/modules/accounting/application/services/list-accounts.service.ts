import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AccountDto } from "../dtos/account.dto";
import { toAccountDto, toAccountListQuery } from "../mappers/account.mapper";
import {
  ListAccountsSchema,
  type ListAccountsInput,
} from "../schemas/list-accounts.schema";

export class ListAccountsService {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(input: ListAccountsInput): Promise<PaginatedResult<AccountDto>> {
    const query = parseRequest(ListAccountsSchema, input);
    const result = await this.accountRepository.findPaged(
      toAccountListQuery(query),
    );

    return {
      items: result.items.map(toAccountDto),
      meta: result.meta,
    };
  }
}
