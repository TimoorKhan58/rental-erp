import type { PaginationMeta } from "@/types/api";

export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const JOURNAL_ENTRY_STATUSES = ["DRAFT", "POSTED", "VOID"] as const;
export type JournalEntryStatus = (typeof JOURNAL_ENTRY_STATUSES)[number];

export const JOURNAL_REFERENCE_TYPES = [
  "RENTAL_INVOICE",
  "PAYMENT",
  "MANUAL",
  "OTHER",
] as const;
export type JournalReferenceType = (typeof JOURNAL_REFERENCE_TYPES)[number];

export type AccountResponse = {
  id: string;
  accountCode: string;
  name: string;
  accountType: AccountType;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccountListResponse = {
  items: AccountResponse[];
  meta: PaginationMeta;
};

export type AccountSortField =
  | "accountCode"
  | "name"
  | "accountType"
  | "isActive"
  | "createdAt";

export type ListAccountsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: AccountSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  accountType?: AccountType;
  isActive?: boolean;
};

export type JournalLineResponse = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  memo: string | null;
  sortOrder: number;
};

export type JournalEntryResponse = {
  id: string;
  journalNumber: string;
  journalDate: string;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  status: JournalEntryStatus;
  postedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  postedById: string | null;
  lines: JournalLineResponse[];
  createdAt: string;
  updatedAt: string;
};

export type JournalEntryListResponse = {
  items: JournalEntryResponse[];
  meta: PaginationMeta;
};

export type JournalEntrySortField =
  | "journalNumber"
  | "journalDate"
  | "status"
  | "createdAt";

export type ListJournalEntriesParams = {
  page?: number;
  pageSize?: number;
  sortBy?: JournalEntrySortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: JournalEntryStatus;
  referenceType?: JournalReferenceType;
  journalDateFrom?: string;
  journalDateTo?: string;
};

export type TrialBalanceLine = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
};

export type TrialBalanceResponse = {
  dateFrom: string | null;
  dateTo: string | null;
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
};

export type TrialBalanceParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type LedgerEntryLine = {
  journalEntryId: string;
  journalNumber: string;
  journalDate: string;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  memo: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
};

export type GeneralLedgerResponse = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  dateFrom: string | null;
  dateTo: string | null;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntryLine[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type LedgerSortField = "journalDate" | "journalNumber" | "createdAt";

export type GeneralLedgerParams = {
  accountId: string;
  page?: number;
  pageSize?: number;
  sortBy?: LedgerSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type BalanceSheetResponse = {
  asOfDate: string | null;
  assets: { accounts: { accountId: string; accountCode: string; accountName: string; balance: number }[]; total: number };
  liabilities: { accounts: { accountId: string; accountCode: string; accountName: string; balance: number }[]; total: number };
  equity: { accounts: { accountId: string; accountCode: string; accountName: string; balance: number }[]; total: number };
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number;
  isBalanced: boolean;
};

export type ProfitLossResponse = {
  dateFrom: string | null;
  dateTo: string | null;
  revenue: { accountId: string; accountCode: string; accountName: string; amount: number }[];
  expenses: { accountId: string; accountCode: string; accountName: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
};

export type AccountsSummaryResponse = {
  activeAccounts: number;
  inactiveAccounts: number;
  totalAccounts: number;
  accountsByType: { accountType: AccountType; count: number }[];
};

export type AccountingSummaryResponse = {
  balanceSheet: BalanceSheetResponse;
  profitLoss: ProfitLossResponse;
  accountsSummary: AccountsSummaryResponse;
};

export type DateRangeParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type BalanceSheetParams = {
  asOfDate?: string;
};
