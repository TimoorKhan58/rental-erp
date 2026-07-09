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
import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import {
  buildTrialBalanceLines,
  buildTrialBalanceReport,
  calculateDebitCreditNet,
  calculateEndingBalance,
  roundMoney,
  withBalanceSheetEquation,
} from "@/modules/financial-report/domain/financial-report.rules";
import type {
  AccountBalanceAggregate,
  AccountLedgerReport,
  AccountsSummaryReport,
  BalanceSheetAccountLine,
  BalanceSheetReport,
  CashFlowSummaryReport,
  ExpenseSummaryReport,
  GeneralLedgerReport,
  JournalReport,
  ProfitLossReport,
  RevenueSummaryReport,
  TrialBalanceReport,
} from "@/modules/financial-report/domain/financial-report.types";
import { FINANCIAL_REPORT_POSTED_STATUS } from "@/modules/financial-report/domain/financial-report.constants";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type {
  FixtureAccount,
  FixtureJournal,
  FixturePayment,
} from "./financial-report.fixtures";

function inRange(date: Date, from?: Date, to?: Date): boolean {
  if (from !== undefined && date.getTime() < from.getTime()) {
    return false;
  }
  if (to !== undefined && date.getTime() > to.getTime()) {
    return false;
  }
  return true;
}

function totalPages(total: number, pageSize: number): number {
  return total === 0 ? 0 : Math.ceil(total / pageSize);
}

export class InMemoryFinancialReportRepository
  implements IFinancialReportRepository
{
  private accounts: FixtureAccount[] = [];
  private journals: FixtureJournal[] = [];
  private payments: FixturePayment[] = [];

  seed(options: {
    accounts?: FixtureAccount[];
    journals?: FixtureJournal[];
    payments?: FixturePayment[];
  }): void {
    if (options.accounts !== undefined) {
      this.accounts = [...options.accounts];
    }
    if (options.journals !== undefined) {
      this.journals = [...options.journals];
    }
    if (options.payments !== undefined) {
      this.payments = [...options.payments];
    }
  }

  clear(): void {
    this.accounts = [];
    this.journals = [];
    this.payments = [];
  }

  async getAccountBalanceAggregates(
    query: TrialBalanceQuery,
  ): Promise<AccountBalanceAggregate[]> {
    const posted = this.journals.filter(
      (journal) =>
        journal.status === FINANCIAL_REPORT_POSTED_STATUS &&
        inRange(journal.journalDate, query.dateFrom, query.dateTo),
    );

    const totals = new Map<string, { debit: number; credit: number }>();
    for (const journal of posted) {
      for (const line of journal.lines) {
        const current = totals.get(line.accountId) ?? { debit: 0, credit: 0 };
        current.debit = roundMoney(current.debit + line.debit);
        current.credit = roundMoney(current.credit + line.credit);
        totals.set(line.accountId, current);
      }
    }

    return this.accounts
      .slice()
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
      .map((account) => {
        const amounts = totals.get(account.id) ?? { debit: 0, credit: 0 };
        return {
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.name,
          accountType: account.accountType,
          isActive: account.isActive,
          totalDebit: amounts.debit,
          totalCredit: amounts.credit,
        };
      });
  }

  async getTrialBalance(query: TrialBalanceQuery): Promise<TrialBalanceReport> {
    const aggregates = await this.getAccountBalanceAggregates(query);
    return buildTrialBalanceReport(
      buildTrialBalanceLines(aggregates),
      query.dateFrom ?? null,
      query.dateTo ?? null,
    );
  }

  async getBalanceSheet(query: BalanceSheetQuery): Promise<BalanceSheetReport> {
    const aggregates = await this.getAccountBalanceAggregates({
      dateTo: query.asOfDate,
    });

    const toSection = (
      accountType: FixtureAccount["accountType"],
    ): { accounts: BalanceSheetAccountLine[]; total: number } => {
      const accounts = aggregates
        .filter((row) => row.accountType === accountType)
        .map((row) => ({
          accountId: row.accountId,
          accountCode: row.accountCode,
          accountName: row.accountName,
          balance: calculateEndingBalance(
            row.accountType,
            row.totalDebit,
            row.totalCredit,
          ),
        }))
        .filter((row) => row.balance !== 0);

      return {
        accounts,
        total: roundMoney(accounts.reduce((sum, row) => sum + row.balance, 0)),
      };
    };

    const assets = toSection("ASSET");
    const liabilities = toSection("LIABILITY");
    const equityAccounts = toSection("EQUITY");

    const incomeTotal = roundMoney(
      aggregates
        .filter((row) => row.accountType === "INCOME")
        .reduce(
          (sum, row) =>
            sum +
            calculateEndingBalance(
              row.accountType,
              row.totalDebit,
              row.totalCredit,
            ),
          0,
        ),
    );
    const expenseTotal = roundMoney(
      aggregates
        .filter((row) => row.accountType === "EXPENSE")
        .reduce(
          (sum, row) =>
            sum +
            calculateEndingBalance(
              row.accountType,
              row.totalDebit,
              row.totalCredit,
            ),
          0,
        ),
    );
    const netIncome = roundMoney(incomeTotal - expenseTotal);

    const equity = {
      accounts: [
        ...equityAccounts.accounts,
        ...(netIncome !== 0
          ? [
              {
                accountId: "net-income",
                accountCode: "NI",
                accountName: "Net Income",
                balance: netIncome,
              },
            ]
          : []),
      ],
      total: roundMoney(equityAccounts.total + netIncome),
    };

    return withBalanceSheetEquation({
      asOfDate: query.asOfDate ?? null,
      assets,
      liabilities,
      equity,
      totalAssets: assets.total,
      totalLiabilities: liabilities.total,
      totalEquity: equity.total,
      netIncome,
    });
  }

  async getProfitLoss(query: ProfitLossQuery): Promise<ProfitLossReport> {
    const aggregates = await this.getAccountBalanceAggregates(query);
    const revenue = aggregates
      .filter((row) => row.accountType === "INCOME")
      .map((row) => ({
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        amount: calculateEndingBalance(
          row.accountType,
          row.totalDebit,
          row.totalCredit,
        ),
      }))
      .filter((row) => row.amount !== 0);

    const expenses = aggregates
      .filter((row) => row.accountType === "EXPENSE")
      .map((row) => ({
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        amount: calculateEndingBalance(
          row.accountType,
          row.totalDebit,
          row.totalCredit,
        ),
      }))
      .filter((row) => row.amount !== 0);

    const totalRevenue = roundMoney(
      revenue.reduce((sum, row) => sum + row.amount, 0),
    );
    const totalExpenses = roundMoney(
      expenses.reduce((sum, row) => sum + row.amount, 0),
    );

    return {
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netProfit: roundMoney(totalRevenue - totalExpenses),
    };
  }

  getGeneralLedger(query: GeneralLedgerQuery): Promise<GeneralLedgerReport> {
    return this.getAccountLedger(query);
  }

  async getAccountLedger(
    query: AccountLedgerQuery,
  ): Promise<AccountLedgerReport> {
    const account = this.accounts.find((row) => row.id === query.accountId);
    if (account === undefined) {
      throw new NotFoundError({
        message: "Account not found",
        details: { id: query.accountId },
      });
    }

    const postedLines = this.journals
      .filter((journal) => journal.status === FINANCIAL_REPORT_POSTED_STATUS)
      .flatMap((journal) =>
        journal.lines
          .filter((line) => line.accountId === query.accountId)
          .map((line) => ({ journal, line })),
      );

    const openingLines =
      query.dateFrom === undefined
        ? []
        : postedLines.filter(
            ({ journal }) =>
              journal.journalDate.getTime() < query.dateFrom!.getTime(),
          );

    const openingDebit = openingLines.reduce(
      (sum, row) => sum + row.line.debit,
      0,
    );
    const openingCredit = openingLines.reduce(
      (sum, row) => sum + row.line.credit,
      0,
    );
    const openingBalance = calculateEndingBalance(
      account.accountType,
      openingDebit,
      openingCredit,
    );

    const periodLines = postedLines
      .filter(({ journal }) =>
        inRange(journal.journalDate, query.dateFrom, query.dateTo),
      )
      .sort((a, b) => {
        const sortBy = query.sortBy ?? "journalDate";
        const left =
          sortBy === "journalNumber"
            ? a.journal.journalNumber
            : sortBy === "createdAt"
              ? a.journal.createdAt.getTime()
              : a.journal.journalDate.getTime();
        const right =
          sortBy === "journalNumber"
            ? b.journal.journalNumber
            : sortBy === "createdAt"
              ? b.journal.createdAt.getTime()
              : b.journal.journalDate.getTime();
        if (left === right) {
          return a.line.sortOrder - b.line.sortOrder;
        }
        const cmp = left < right ? -1 : 1;
        return query.sortOrder === "desc" ? -cmp : cmp;
      });

    let running = openingBalance;
    const mapped = periodLines.map(({ journal, line }) => {
      const delta =
        account.accountType === "ASSET" || account.accountType === "EXPENSE"
          ? calculateDebitCreditNet(line.debit, line.credit)
          : roundMoney(line.credit - line.debit);
      running = roundMoney(running + delta);
      return {
        journalEntryId: journal.id,
        journalNumber: journal.journalNumber,
        journalDate: journal.journalDate,
        description: journal.description,
        referenceType: journal.referenceType,
        referenceId: journal.referenceId,
        memo: line.memo,
        debit: line.debit,
        credit: line.credit,
        runningBalance: running,
      };
    });

    const total = mapped.length;
    const start = (query.page - 1) * query.pageSize;
    const entries = mapped.slice(start, start + query.pageSize);

    return {
      accountId: account.id,
      accountCode: account.accountCode,
      accountName: account.name,
      accountType: account.accountType,
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      openingBalance,
      closingBalance:
        mapped.length > 0
          ? mapped[mapped.length - 1]!.runningBalance
          : openingBalance,
      entries,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: totalPages(total, query.pageSize),
    };
  }

  async getJournalReport(query: JournalReportQuery): Promise<JournalReport> {
    let journals = this.journals.filter((journal) =>
      inRange(journal.journalDate, query.dateFrom, query.dateTo),
    );

    if (query.status !== undefined) {
      journals = journals.filter((journal) => journal.status === query.status);
    }

    if (query.search !== undefined && query.search.length > 0) {
      const term = query.search.toLowerCase();
      journals = journals.filter(
        (journal) =>
          journal.journalNumber.toLowerCase().includes(term) ||
          journal.description.toLowerCase().includes(term),
      );
    }

    const sortBy = query.sortBy ?? "journalDate";
    const sortOrder = query.sortOrder ?? "desc";
    journals = journals.slice().sort((a, b) => {
      const left =
        sortBy === "journalNumber"
          ? a.journalNumber
          : sortBy === "status"
            ? a.status
            : sortBy === "createdAt"
              ? a.createdAt.getTime()
              : a.journalDate.getTime();
      const right =
        sortBy === "journalNumber"
          ? b.journalNumber
          : sortBy === "status"
            ? b.status
            : sortBy === "createdAt"
              ? b.createdAt.getTime()
              : b.journalDate.getTime();
      if (left === right) {
        return 0;
      }
      const cmp = left < right ? -1 : 1;
      return sortOrder === "desc" ? -cmp : cmp;
    });

    const total = journals.length;
    const start = (query.page - 1) * query.pageSize;
    const pageItems = journals.slice(start, start + query.pageSize);

    return {
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      items: pageItems.map((journal) => {
        const lines = journal.lines.map((line) => {
          const account = this.accounts.find(
            (row) => row.id === line.accountId,
          )!;
          return {
            accountId: line.accountId,
            accountCode: account.accountCode,
            accountName: account.name,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo,
            sortOrder: line.sortOrder,
          };
        });
        return {
          id: journal.id,
          journalNumber: journal.journalNumber,
          journalDate: journal.journalDate,
          status: journal.status,
          description: journal.description,
          referenceType: journal.referenceType,
          referenceId: journal.referenceId,
          lines,
          debitTotal: roundMoney(
            lines.reduce((sum, line) => sum + line.debit, 0),
          ),
          creditTotal: roundMoney(
            lines.reduce((sum, line) => sum + line.credit, 0),
          ),
        };
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: totalPages(total, query.pageSize),
    };
  }

  async getCashFlowSummary(
    query: CashFlowSummaryQuery,
  ): Promise<CashFlowSummaryReport> {
    const profitLoss = await this.getProfitLoss(query);
    const cashReceipts = roundMoney(
      this.payments
        .filter(
          (payment) =>
            payment.status === "POSTED" &&
            inRange(payment.paymentDate, query.dateFrom, query.dateTo),
        )
        .reduce((sum, payment) => sum + payment.amount, 0),
    );
    const cashPayments = roundMoney(
      (
        await this.getAccountBalanceAggregates(query)
      )
        .filter((row) => row.accountType === "EXPENSE")
        .reduce((sum, row) => sum + row.totalDebit, 0),
    );

    return {
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      netIncome: profitLoss.netProfit,
      adjustments: 0,
      cashFromOperations: profitLoss.netProfit,
      cashReceipts,
      cashPayments,
      netCashChange: roundMoney(cashReceipts - cashPayments),
    };
  }

  async getRevenueSummary(
    query: RevenueSummaryQuery,
  ): Promise<RevenueSummaryReport> {
    const profitLoss = await this.getProfitLoss(query);
    return {
      dateFrom: profitLoss.dateFrom,
      dateTo: profitLoss.dateTo,
      lines: profitLoss.revenue,
      totalRevenue: profitLoss.totalRevenue,
    };
  }

  async getExpenseSummary(
    query: ExpenseSummaryQuery,
  ): Promise<ExpenseSummaryReport> {
    const profitLoss = await this.getProfitLoss(query);
    return {
      dateFrom: profitLoss.dateFrom,
      dateTo: profitLoss.dateTo,
      lines: profitLoss.expenses,
      totalExpenses: profitLoss.totalExpenses,
    };
  }

  async getAccountsSummary(
    query: AccountsSummaryQuery,
  ): Promise<AccountsSummaryReport> {
    void query;
    const activeAccounts = this.accounts.filter((row) => row.isActive).length;
    const inactiveAccounts = this.accounts.length - activeAccounts;
    const typeMap = new Map<FixtureAccount["accountType"], number>();
    for (const account of this.accounts) {
      typeMap.set(account.accountType, (typeMap.get(account.accountType) ?? 0) + 1);
    }

    return {
      activeAccounts,
      inactiveAccounts,
      totalAccounts: this.accounts.length,
      accountsByType: (
        ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const
      ).map((accountType) => ({
        accountType,
        count: typeMap.get(accountType) ?? 0,
      })),
    };
  }
}
