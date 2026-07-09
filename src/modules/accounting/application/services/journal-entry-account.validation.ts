import type { Account } from "@/modules/accounting/domain/account.entity";
import {
  AccountEligibilityError,
  assertAccountActive,
} from "@/modules/accounting/domain";
import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type { AccountId } from "@/shared/domain/ids";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

export async function validateAccountsForJournalLines(
  accountRepository: IAccountRepository,
  accountIds: AccountId[],
): Promise<Account[]> {
  const uniqueIds = [...new Set(accountIds)];
  const accounts: Account[] = [];

  for (const accountId of uniqueIds) {
    const account = await accountRepository.findById(accountId);

    if (account === null) {
      throw new NotFoundError({
        message: "Account not found",
        details: { accountId },
      });
    }

    try {
      assertAccountActive(account.isActive);
    } catch (error) {
      if (error instanceof AccountEligibilityError) {
        throw new UnprocessableError({
          message: error.message,
          details: { accountId },
        });
      }

      throw error;
    }

    accounts.push(account);
  }

  return accounts;
}
