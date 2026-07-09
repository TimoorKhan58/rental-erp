import { AccountInvariantError } from "@/modules/accounting/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { AccountDto } from "../dtos/account.dto";
import {
  toAccountDto,
  toAccountId,
  toUpdateAccountData,
} from "../mappers/account.mapper";
import {
  AccountIdParamSchema,
  UpdateAccountSchema,
  type AccountIdParamInput,
  type UpdateAccountInput,
} from "../schemas/account.schemas";
import { toAccountAuditValues } from "./account-audit.mapper";
import {
  ACCOUNT_ENTITY_NAME,
  ACCOUNT_MODULE,
} from "./accounting-service.constants";
import type { IAccountingTransactionRunner } from "./accounting-transaction.runner";

export class UpdateAccountService {
  constructor(
    private readonly transactionRunner: IAccountingTransactionRunner,
  ) {}

  async execute(
    params: AccountIdParamInput,
    input: UpdateAccountInput,
  ): Promise<AccountDto> {
    const { id } = parseRequest(AccountIdParamSchema, params);
    const data = parseRequest(UpdateAccountSchema, input);
    const updateData = toUpdateAccountData(data);

    return this.transactionRunner.run(
      async ({ accountRepository, auditLogger }) => {
        const existing = await accountRepository.findById(toAccountId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Account not found",
            details: { id },
          });
        }

        try {
          existing.withUpdated(updateData);
        } catch (error) {
          if (error instanceof AccountInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const previousValues = toAccountAuditValues(existing);
        const updated = await accountRepository.update(existing.id, updateData);

        await auditLogger.log({
          module: ACCOUNT_MODULE,
          entityName: ACCOUNT_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toAccountAuditValues(updated),
        });

        return toAccountDto(updated);
      },
    );
  }
}
