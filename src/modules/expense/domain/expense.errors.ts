import type { ExpenseStatus } from "./expense.constants";

export class ExpenseInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ExpenseInvariantError";
  }
}

export class ExpenseInvalidStatusError extends Error {
  constructor(
    readonly currentStatus: ExpenseStatus,
    readonly action: string,
  ) {
    super(`Cannot ${action} expense in ${currentStatus} status`);
    this.name = "ExpenseInvalidStatusError";
  }
}

export class ExpenseEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseEligibilityError";
  }
}

export function createExpenseNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ExpenseInvariantError(
      "Expense number is required",
      "expenseNumber",
    );
  }

  return trimmed;
}
