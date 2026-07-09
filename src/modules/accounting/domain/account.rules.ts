import {
  AccountEligibilityError,
  createAccountCode,
  createAccountName,
  createAccountType,
} from "./account.errors";
import type {
  AccountProps,
  CreateAccountData,
  UpdateAccountData,
} from "./account.types";

export function assertAccountActive(isActive: boolean): void {
  if (!isActive) {
    throw new AccountEligibilityError(
      "Inactive accounts cannot receive journal lines",
    );
  }
}

export function normalizeCreateAccountData(
  data: CreateAccountData,
): Omit<AccountProps, "id" | "createdAt" | "updatedAt"> {
  return {
    accountCode: createAccountCode(data.accountCode),
    name: createAccountName(data.name),
    accountType: createAccountType(data.accountType),
    description: normalizeOptionalText(data.description),
    isActive: data.isActive ?? true,
  };
}

export function normalizeAccountProps(props: AccountProps): AccountProps {
  return {
    ...props,
    accountCode: createAccountCode(props.accountCode),
    name: createAccountName(props.name),
    accountType: createAccountType(props.accountType),
    description: normalizeOptionalText(props.description),
  };
}

export function normalizeUpdateAccountData(
  data: UpdateAccountData,
): UpdateAccountData {
  const normalized: UpdateAccountData = { ...data };

  if (data.name !== undefined) {
    normalized.name = createAccountName(data.name);
  }

  if (data.accountType !== undefined) {
    normalized.accountType = createAccountType(data.accountType);
  }

  if (data.description !== undefined) {
    normalized.description = normalizeOptionalText(data.description);
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
