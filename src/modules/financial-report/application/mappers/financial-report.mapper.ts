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
} from "@/modules/financial-report/domain/financial-report.queries";
import type {
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
} from "@/modules/financial-report/domain/financial-report.types";

import type {
  AccountLedgerDto,
  AccountsSummaryDto,
  BalanceSheetDto,
  CashFlowSummaryDto,
  ExpenseSummaryDto,
  GeneralLedgerDto,
  JournalReportDto,
  ProfitLossDto,
  RevenueSummaryDto,
  TrialBalanceDto,
} from "../dtos/financial-report.dto";
import type {
  AccountLedgerQueryParsed,
  AccountsSummaryQueryParsed,
  BalanceSheetQueryParsed,
  CashFlowSummaryQueryParsed,
  ExpenseSummaryQueryParsed,
  GeneralLedgerQueryParsed,
  JournalReportQueryParsed,
  ProfitLossQueryParsed,
  RevenueSummaryQueryParsed,
  TrialBalanceQueryParsed,
} from "../schemas/financial-report.schemas";

function toIsoDate(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export function toTrialBalanceQuery(
  input: TrialBalanceQueryParsed,
): TrialBalanceQuery {
  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
}

export function toBalanceSheetQuery(
  input: BalanceSheetQueryParsed,
): BalanceSheetQuery {
  return {
    asOfDate: input.asOfDate,
  };
}

export function toProfitLossQuery(
  input: ProfitLossQueryParsed,
): ProfitLossQuery {
  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
}

export function toAccountLedgerQuery(
  input: AccountLedgerQueryParsed,
): AccountLedgerQuery {
  return {
    accountId: input.accountId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
  };
}

export function toGeneralLedgerQuery(
  input: GeneralLedgerQueryParsed,
): GeneralLedgerQuery {
  return toAccountLedgerQuery(input);
}

export function toJournalReportQuery(
  input: JournalReportQueryParsed,
): JournalReportQuery {
  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
  };
}

export function toCashFlowSummaryQuery(
  input: CashFlowSummaryQueryParsed,
): CashFlowSummaryQuery {
  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
}

export function toRevenueSummaryQuery(
  input: RevenueSummaryQueryParsed,
): RevenueSummaryQuery {
  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
}

export function toExpenseSummaryQuery(
  input: ExpenseSummaryQueryParsed,
): ExpenseSummaryQuery {
  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
}

export function toAccountsSummaryQuery(
  input: AccountsSummaryQueryParsed,
): AccountsSummaryQuery {
  void input;
  return {};
}

export function toTrialBalanceDto(report: TrialBalanceReport): TrialBalanceDto {
  return {
    dateFrom: toIsoDate(report.dateFrom),
    dateTo: toIsoDate(report.dateTo),
    lines: report.lines.map((line) => ({
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      accountType: line.accountType,
      totalDebit: line.totalDebit,
      totalCredit: line.totalCredit,
      endingBalance: line.endingBalance,
    })),
    totalDebit: report.totalDebit,
    totalCredit: report.totalCredit,
    isBalanced: report.isBalanced,
  };
}

export function toBalanceSheetDto(report: BalanceSheetReport): BalanceSheetDto {
  const mapSection = (section: BalanceSheetReport["assets"]) => ({
    accounts: section.accounts.map((account) => ({
      accountId: account.accountId,
      accountCode: account.accountCode,
      accountName: account.accountName,
      balance: account.balance,
    })),
    total: section.total,
  });

  return {
    asOfDate: toIsoDate(report.asOfDate),
    assets: mapSection(report.assets),
    liabilities: mapSection(report.liabilities),
    equity: mapSection(report.equity),
    totalAssets: report.totalAssets,
    totalLiabilities: report.totalLiabilities,
    totalEquity: report.totalEquity,
    netIncome: report.netIncome,
    isBalanced: report.isBalanced,
  };
}

export function toProfitLossDto(report: ProfitLossReport): ProfitLossDto {
  return {
    dateFrom: toIsoDate(report.dateFrom),
    dateTo: toIsoDate(report.dateTo),
    revenue: report.revenue.map((line) => ({
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      amount: line.amount,
    })),
    expenses: report.expenses.map((line) => ({
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      amount: line.amount,
    })),
    totalRevenue: report.totalRevenue,
    totalExpenses: report.totalExpenses,
    netProfit: report.netProfit,
  };
}

export function toAccountLedgerDto(
  report: AccountLedgerReport,
): AccountLedgerDto {
  return {
    accountId: report.accountId,
    accountCode: report.accountCode,
    accountName: report.accountName,
    accountType: report.accountType,
    dateFrom: toIsoDate(report.dateFrom),
    dateTo: toIsoDate(report.dateTo),
    openingBalance: report.openingBalance,
    closingBalance: report.closingBalance,
    entries: report.entries.map((entry) => ({
      journalEntryId: entry.journalEntryId,
      journalNumber: entry.journalNumber,
      journalDate: entry.journalDate.toISOString(),
      description: entry.description,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      memo: entry.memo,
      debit: entry.debit,
      credit: entry.credit,
      runningBalance: entry.runningBalance,
    })),
    page: report.page,
    pageSize: report.pageSize,
    total: report.total,
    totalPages: report.totalPages,
  };
}

export function toGeneralLedgerDto(
  report: GeneralLedgerReport,
): GeneralLedgerDto {
  return toAccountLedgerDto(report);
}

export function toJournalReportDto(report: JournalReport): JournalReportDto {
  return {
    dateFrom: toIsoDate(report.dateFrom),
    dateTo: toIsoDate(report.dateTo),
    items: report.items.map((item) => ({
      id: item.id,
      journalNumber: item.journalNumber,
      journalDate: item.journalDate.toISOString(),
      status: item.status,
      description: item.description,
      referenceType: item.referenceType,
      referenceId: item.referenceId,
      lines: item.lines.map((line) => ({
        accountId: line.accountId,
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
        sortOrder: line.sortOrder,
      })),
      debitTotal: item.debitTotal,
      creditTotal: item.creditTotal,
    })),
    page: report.page,
    pageSize: report.pageSize,
    total: report.total,
    totalPages: report.totalPages,
  };
}

export function toCashFlowSummaryDto(
  report: CashFlowSummaryReport,
): CashFlowSummaryDto {
  return {
    dateFrom: toIsoDate(report.dateFrom),
    dateTo: toIsoDate(report.dateTo),
    netIncome: report.netIncome,
    adjustments: report.adjustments,
    cashFromOperations: report.cashFromOperations,
    cashReceipts: report.cashReceipts,
    cashPayments: report.cashPayments,
    netCashChange: report.netCashChange,
  };
}

export function toRevenueSummaryDto(
  report: RevenueSummaryReport,
): RevenueSummaryDto {
  return {
    dateFrom: toIsoDate(report.dateFrom),
    dateTo: toIsoDate(report.dateTo),
    lines: report.lines.map((line) => ({
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      amount: line.amount,
    })),
    totalRevenue: report.totalRevenue,
  };
}

export function toExpenseSummaryDto(
  report: ExpenseSummaryReport,
): ExpenseSummaryDto {
  return {
    dateFrom: toIsoDate(report.dateFrom),
    dateTo: toIsoDate(report.dateTo),
    lines: report.lines.map((line) => ({
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      amount: line.amount,
    })),
    totalExpenses: report.totalExpenses,
  };
}

export function toAccountsSummaryDto(
  report: AccountsSummaryReport,
): AccountsSummaryDto {
  return {
    activeAccounts: report.activeAccounts,
    inactiveAccounts: report.inactiveAccounts,
    totalAccounts: report.totalAccounts,
    accountsByType: report.accountsByType.map((row) => ({
      accountType: row.accountType,
      count: row.count,
    })),
  };
}
