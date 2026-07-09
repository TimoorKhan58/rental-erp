import type { AccountType } from "@/modules/accounting/domain/account.constants";
import type { JournalEntryStatus } from "@/modules/accounting/domain/journal-entry.constants";

export const FINANCIAL_REPORT_MODULE = "financial-reports";

export const FINANCIAL_REPORT_POSTED_STATUS =
  "POSTED" as const satisfies JournalEntryStatus;

export const BALANCE_SHEET_ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
] as const satisfies readonly AccountType[];

export const PROFIT_LOSS_ACCOUNT_TYPES = [
  "INCOME",
  "EXPENSE",
] as const satisfies readonly AccountType[];

export const DEBIT_NORMAL_ACCOUNT_TYPES = [
  "ASSET",
  "EXPENSE",
] as const satisfies readonly AccountType[];

export const CREDIT_NORMAL_ACCOUNT_TYPES = [
  "LIABILITY",
  "EQUITY",
  "INCOME",
] as const satisfies readonly AccountType[];

export const JOURNAL_REPORT_SORT_FIELDS = [
  "journalNumber",
  "journalDate",
  "status",
  "createdAt",
] as const;

export type JournalReportSortField =
  (typeof JOURNAL_REPORT_SORT_FIELDS)[number];

export const LEDGER_SORT_FIELDS = [
  "journalDate",
  "journalNumber",
  "createdAt",
] as const;

export type LedgerSortField = (typeof LEDGER_SORT_FIELDS)[number];

export const JOURNAL_REPORT_SEARCH_FIELDS = [
  "journalNumber",
  "description",
] as const;
