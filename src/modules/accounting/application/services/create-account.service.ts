import {
  Account,
  AccountInvariantError,
} from "@/modules/accounting/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { AccountDto } from "../dtos/account.dto";
import {
  toAccountDto,
  toCreateAccountData,
} from "../mappers/account.mapper";
import {
  CreateAccountSchema,
  type CreateAccountInput,
} from "../schemas/account.schemas";
import { toAccountAuditValues } from "./account-audit.mapper";
import {
  ACCOUNT_ENTITY_NAME,
  ACCOUNT_MODULE,
} from "./accounting-service.constants";
import type { IAccountingTransactionRunner } from "./accounting-transaction.runner";

export class CreateAccountService {
  constructor(
    private readonly transactionRunner: IAccountingTransactionRunner,
  ) {}

  async execute(input: CreateAccountInput): Promise<AccountDto> {
    const data = parseRequest(CreateAccountSchema, input);
    const createData = toCreateAccountData(data);

    return this.transactionRunner.run(
      async ({ accountRepository, auditLogger }) => {
        try {
          Account.create(createData);
        } catch (error) {
          if (error instanceof AccountInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const existing = await accountRepository.findByAccountCode(
          createData.accountCode,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Account code already exists",
            details: { accountCode: createData.accountCode },
          });
        }

        const account = await accountRepository.create(createData);

        await auditLogger.log({
          module: ACCOUNT_MODULE,
          entityName: ACCOUNT_ENTITY_NAME,
          recordId: account.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toAccountAuditValues(account),
        });

        return toAccountDto(account);
      },
    );
  }
}
