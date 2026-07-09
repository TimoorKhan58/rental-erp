import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { AccountDto } from "../dtos/account.dto";
import { toAccountDto, toAccountId } from "../mappers/account.mapper";
import {
  AccountIdParamSchema,
  type AccountIdParamInput,
} from "../schemas/account.schemas";

export class GetAccountByIdService {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(params: AccountIdParamInput): Promise<AccountDto> {
    const { id } = parseRequest(AccountIdParamSchema, params);

    const account = await this.accountRepository.findById(toAccountId(id));

    if (account === null) {
      throw new NotFoundError({
        message: "Account not found",
        details: { id },
      });
    }

    return toAccountDto(account);
  }
}
