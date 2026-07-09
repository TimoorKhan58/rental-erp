import type { JournalEntryStatus } from "@/modules/accounting/domain/journal-entry.constants";

import type {
  JournalReportSortField,
  LedgerSortField,
} from "./financial-report.constants";

export interface DateRangeQuery {
  dateFrom?: Date;
  dateTo?: Date;
}

export type TrialBalanceQuery = DateRangeQuery;

export interface BalanceSheetQuery {
  asOfDate?: Date;
}

export type ProfitLossQuery = DateRangeQuery;

export interface AccountLedgerQuery extends DateRangeQuery {
  accountId: string;
  page: number;
  pageSize: number;
  sortBy?: LedgerSortField;
  sortOrder?: "asc" | "desc";
}

export type GeneralLedgerQuery = AccountLedgerQuery;

export interface JournalReportQuery extends DateRangeQuery {
  page: number;
  pageSize: number;
  sortBy?: JournalReportSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: JournalEntryStatus;
}

export type CashFlowSummaryQuery = DateRangeQuery;

export type RevenueSummaryQuery = DateRangeQuery;

export type ExpenseSummaryQuery = DateRangeQuery;

export type AccountsSummaryQuery = Record<string, never>;
