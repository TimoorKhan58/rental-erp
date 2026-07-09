import type { AccountType } from "./account.constants";

export class AccountInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "AccountInvariantError";
  }
}

export class AccountEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountEligibilityError";
  }
}

export function createAccountCode(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new AccountInvariantError("Account code is required", "accountCode");
  }

  return trimmed;
}

export function createAccountName(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new AccountInvariantError("Account name is required", "name");
  }

  return trimmed;
}

export function createAccountType(value: AccountType): AccountType {
  return value;
}
