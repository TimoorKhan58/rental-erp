import type {
  AccountLedgerQuery,
  AccountsSummaryQuery,
  BalanceSheetQuery,
  CashFlowSummaryQuery,
  ExpenseSummaryQuery,
  GeneralLedgerQuery,
  JournalReportQuery,
  ProfitLossQuery,
  RevenueSummaryQuery,
  TrialBalanceQuery,
} from "./financial-report.queries";
import type {
  AccountBalanceAggregate,
  AccountLedgerReport,
  AccountsSummaryReport,
  BalanceSheetReport,
  CashFlowSummaryReport,
  ExpenseSummaryReport,
  GeneralLedgerReport,
  JournalReport,
  ProfitLossReport,
  RevenueSummaryReport,
  TrialBalanceReport,
} from "./financial-report.types";

export interface IFinancialReportRepository {
  getTrialBalance(query: TrialBalanceQuery): Promise<TrialBalanceReport>;
  getBalanceSheet(query: BalanceSheetQuery): Promise<BalanceSheetReport>;
  getProfitLoss(query: ProfitLossQuery): Promise<ProfitLossReport>;
  getGeneralLedger(query: GeneralLedgerQuery): Promise<GeneralLedgerReport>;
  getAccountLedger(query: AccountLedgerQuery): Promise<AccountLedgerReport>;
  getJournalReport(query: JournalReportQuery): Promise<JournalReport>;
  getCashFlowSummary(
    query: CashFlowSummaryQuery,
  ): Promise<CashFlowSummaryReport>;
  getRevenueSummary(query: RevenueSummaryQuery): Promise<RevenueSummaryReport>;
  getExpenseSummary(query: ExpenseSummaryQuery): Promise<ExpenseSummaryReport>;
  getAccountsSummary(
    query: AccountsSummaryQuery,
  ): Promise<AccountsSummaryReport>;

  /**
   * Low-level aggregate helper used by in-memory repositories and tests.
   */
  getAccountBalanceAggregates?(
    query: TrialBalanceQuery,
  ): Promise<AccountBalanceAggregate[]>;
}

export type { IFinancialReportRepository as FinancialReportRepository };
