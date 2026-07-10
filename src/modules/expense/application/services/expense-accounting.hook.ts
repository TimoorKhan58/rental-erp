import type { Expense } from "@/modules/expense/domain/expense.entity";

export interface IExpenseAccountingHook {
  onExpensePaid(expense: Expense): Promise<void>;
}

export class NoOpExpenseAccountingHook implements IExpenseAccountingHook {
  async onExpensePaid(_expense: Expense): Promise<void> {
    return;
  }
}
