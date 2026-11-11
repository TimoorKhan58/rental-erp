import { postExpensePaidJournal } from "@/modules/accounting/application/services/operational-journal-posting.service";
import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type { Expense } from "@/modules/expense/domain/expense.entity";
import type { JournalEntryId } from "@/shared/domain/ids";

import { toUserId } from "../mappers/expense.mapper";

export interface IExpenseAccountingHook {
  onExpensePaid(expense: Expense): Promise<JournalEntryId | null>;
}

export class NoOpExpenseAccountingHook implements IExpenseAccountingHook {
  async onExpensePaid(_expense: Expense): Promise<JournalEntryId | null> {
    return null;
  }
}

export class ExpenseAccountingHook implements IExpenseAccountingHook {
  constructor(
    private readonly deps: {
      accountRepository: IAccountRepository;
      journalEntryRepository: IJournalEntryRepository;
      userId: string | undefined;
    },
  ) {}

  async onExpensePaid(expense: Expense): Promise<JournalEntryId | null> {
    if (this.deps.userId === undefined) {
      return null;
    }

    const entry = await postExpensePaidJournal(
      {
        accountRepository: this.deps.accountRepository,
        journalEntryRepository: this.deps.journalEntryRepository,
        userId: toUserId(this.deps.userId),
      },
      {
        expenseId: expense.id,
        expenseNumber: expense.expenseNumber,
        expenseDate: expense.expenseDate,
        amount: expense.amount,
      },
    );

    return entry?.id ?? null;
  }
}
