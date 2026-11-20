import type { AccountType } from "./account.constants";

/** Standard account codes every business has (created when missing). */
export const DEFAULT_ACCOUNT_CODES = {
  CASH: "1000",
  ACCOUNTS_RECEIVABLE: "1100",
  RENTAL_EQUIPMENT: "1500",
  ACCOUNTS_PAYABLE: "2000",
  OWNERS_CAPITAL: "3000",
  RENTAL_REVENUE: "4000",
  GENERAL_EXPENSE: "5000",
  HIRE_IN_COST: "5200",
} as const;

export type DefaultAccountCodeKey = keyof typeof DEFAULT_ACCOUNT_CODES;

/**
 * Optional sub-accounts a business may add under cash. When present, money
 * received or paid in cash goes to CASH_IN_HAND and other methods (bank
 * transfer, cheque, card, online) to BANK; otherwise everything uses CASH.
 */
export const OPTIONAL_MONEY_ACCOUNT_CODES = {
  CASH_IN_HAND: "1010",
  BANK: "1020",
} as const;

/** Name and type used when a standard account has to be created. */
export const STANDARD_ACCOUNTS: Record<
  (typeof DEFAULT_ACCOUNT_CODES)[DefaultAccountCodeKey],
  { name: string; accountType: AccountType; description: string }
> = {
  "1000": { name: "Cash", accountType: "ASSET", description: "Primary cash / bank account" },
  "1100": { name: "Accounts Receivable", accountType: "ASSET", description: "Customer rental invoice balances" },
  "1500": { name: "Rental Equipment", accountType: "ASSET", description: "Items bought to rent out, at cost" },
  "2000": { name: "Accounts Payable", accountType: "LIABILITY", description: "Owed to suppliers for purchases and hire-ins" },
  "3000": { name: "Owner's Capital", accountType: "EQUITY", description: "Money and equipment the owner put into the business (opening balance)" },
  "4000": { name: "Rental Revenue", accountType: "INCOME", description: "Rental income from issued invoices" },
  "5000": { name: "General Expense", accountType: "EXPENSE", description: "Operating expenses paid through the expense module" },
  "5200": { name: "Hire-in Cost", accountType: "EXPENSE", description: "Items hired from other suppliers for customer orders" },
};
