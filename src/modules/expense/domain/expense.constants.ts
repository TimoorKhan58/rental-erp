export const EXPENSE_MODULE = "expenses";
export const EXPENSE_ENTITY_NAME = "Expense";

export const EXPENSE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "PAID",
] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_TYPES = ["VENDOR", "MANUAL"] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "CARD",
  "ONLINE",
  "OTHER",
] as const;

export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const EXPENSE_SEARCH_FIELDS = [
  "expenseNumber",
  "description",
  "vendorName",
  "referenceNumber",
  "notes",
] as const;

export const EXPENSE_SORT_FIELDS = [
  "expenseNumber",
  "expenseDate",
  "amount",
  "status",
  "createdAt",
] as const;

export type ExpenseSortField = (typeof EXPENSE_SORT_FIELDS)[number];
