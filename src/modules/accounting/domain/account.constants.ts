export const ACCOUNT_MODULE = "accounts";
export const ACCOUNT_ENTITY_NAME = "Account";

export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_SEARCH_FIELDS = [
  "accountCode",
  "name",
  "description",
] as const;

export const ACCOUNT_SORT_FIELDS = [
  "accountCode",
  "name",
  "accountType",
  "isActive",
  "createdAt",
] as const;

export type AccountSortField = (typeof ACCOUNT_SORT_FIELDS)[number];
