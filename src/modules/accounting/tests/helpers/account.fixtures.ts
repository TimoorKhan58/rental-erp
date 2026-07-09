import { Account } from "@/modules/accounting/domain/account.entity";
import type { CreateAccountData } from "@/modules/accounting/domain/account.types";
import type { AccountId, UserId } from "@/shared/domain/ids";

export const USER_ID =
  "aa0e8400-e29b-41d4-a716-446655440000" as UserId;

export const ACCOUNT_ID =
  "bb0e8400-e29b-41d4-a716-446655440000" as AccountId;

export const OTHER_ACCOUNT_ID =
  "bb0e8400-e29b-41d4-a716-446655440001" as AccountId;

export const CASH_ACCOUNT_ID =
  "bb0e8400-e29b-41d4-a716-446655440002" as AccountId;

export const VALID_CREATE_ACCOUNT_INPUT = {
  accountCode: "1000",
  name: "Cash",
  accountType: "ASSET" as const,
  description: "Main cash account",
  isActive: true,
};

export function buildCreateAccountData(
  override: Partial<CreateAccountData> = {},
): CreateAccountData {
  return {
    accountCode: VALID_CREATE_ACCOUNT_INPUT.accountCode,
    name: VALID_CREATE_ACCOUNT_INPUT.name,
    accountType: VALID_CREATE_ACCOUNT_INPUT.accountType,
    description: VALID_CREATE_ACCOUNT_INPUT.description,
    isActive: VALID_CREATE_ACCOUNT_INPUT.isActive,
    ...override,
  };
}

export function buildAccountEntity(
  override: {
    id?: AccountId;
    accountCode?: string;
    name?: string;
    accountType?: Account["accountType"];
    description?: string | null;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Account {
  const created = Account.create(buildCreateAccountData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Account.reconstitute({
    id: override.id ?? ACCOUNT_ID,
    accountCode: override.accountCode ?? created.accountCode,
    name: override.name ?? created.name,
    accountType: override.accountType ?? created.accountType,
    description:
      override.description !== undefined
        ? override.description
        : created.description,
    isActive: override.isActive ?? created.isActive,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildInactiveAccountEntity(): Account {
  return buildAccountEntity({
    id: OTHER_ACCOUNT_ID,
    accountCode: "2000",
    name: "Inactive Expense",
    accountType: "EXPENSE",
    isActive: false,
  });
}

export function buildCashAccountEntity(): Account {
  return buildAccountEntity({
    id: CASH_ACCOUNT_ID,
    accountCode: "1100",
    name: "Petty Cash",
    accountType: "ASSET",
  });
}
