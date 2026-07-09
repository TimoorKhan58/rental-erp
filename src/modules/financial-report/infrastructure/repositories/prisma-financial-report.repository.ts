import type { AccountType, Prisma } from "@/generated/prisma/client";
import { FINANCIAL_REPORT_POSTED_STATUS } from "@/modules/financial-report/domain/financial-report.constants";
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
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import { repositoryFindFirst, repositoryFindMany } from "@/shared/infrastructure/database";

const MODEL = "FinancialReport";

function decimalToNumber(value: Prisma.Decimal | number): number {
  if (typeof value === "number") {
    return value;
  }
  return value.toNumber();
}

function buildJournalDateFilter(
  dateFrom?: Date,
  dateTo?: Date,
): Prisma.DateTimeFilter | undefined {
  if (dateFrom === undefined && dateTo === undefined) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};
  if (dateFrom !== undefined) {
    filter.gte = dateFrom;
  }
  if (dateTo !== undefined) {
    filter.lte = dateTo;
  }
  return filter;
}

function totalPages(total: number, pageSize: number): number {
  return total === 0 ? 0 : Math.ceil(total / pageSize);
}

export class PrismaFinancialReportRepository
  implements IFinancialReportRepository
{
  constructor(private readonly runner: RepositoryRunner) {}

  async getTrialBalance(query: TrialBalanceQuery): Promise<TrialBalanceReport> {
    const aggregates = await this.getAccountBalanceAggregates(query);
    const lines = buildTrialBalanceLines(aggregates);
    return buildTrialBalanceReport(
      lines,
      query.dateFrom ?? null,
      query.dateTo ?? null,
    );
  }

  async getBalanceSheet(query: BalanceSheetQuery): Promise<BalanceSheetReport> {
    const aggregates = await this.getAccountBalanceAggregates({
      dateTo: query.asOfDate,
    });

    const toSection = (
      accountType: AccountType,
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
        .filter((row) => row.balance !== 0)
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      const total = roundMoney(
        accounts.reduce((sum, row) => sum + row.balance, 0),
      );

      return { accounts, total };
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
      .filter((row) => row.amount !== 0)
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

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
      .filter((row) => row.amount !== 0)
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

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
    const account = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.account.findUnique({
          where: { id: query.accountId },
        }),
      { model: MODEL, operation: "getAccountLedger.findAccount" },
    );

    if (account === null) {
      throw new NotFoundError({
        message: "Account not found",
        details: { id: query.accountId },
      });
    }

    const openingWhere: Prisma.JournalEntryLineWhereInput = {
      accountId: query.accountId,
      journalEntry: {
        status: FINANCIAL_REPORT_POSTED_STATUS,
        ...(query.dateFrom !== undefined
          ? { journalDate: { lt: query.dateFrom } }
          : { journalDate: { lt: new Date(0) } }),
      },
    };

    const openingLines =
      query.dateFrom === undefined
        ? []
        : await repositoryFindMany(
            this.runner,
            (db) =>
              db.journalEntryLine.findMany({
                where: openingWhere,
                select: { debit: true, credit: true },
              }),
            { model: MODEL, operation: "getAccountLedger.opening" },
          );

    const openingDebit = openingLines.reduce(
      (sum, line) => sum + decimalToNumber(line.debit),
      0,
    );
    const openingCredit = openingLines.reduce(
      (sum, line) => sum + decimalToNumber(line.credit),
      0,
    );
    const openingBalance = calculateEndingBalance(
      account.accountType,
      openingDebit,
      openingCredit,
    );

    const periodDateFilter = buildJournalDateFilter(
      query.dateFrom,
      query.dateTo,
    );

    const periodWhere: Prisma.JournalEntryLineWhereInput = {
      accountId: query.accountId,
      journalEntry: {
        status: FINANCIAL_REPORT_POSTED_STATUS,
        ...(periodDateFilter !== undefined
          ? { journalDate: periodDateFilter }
          : {}),
      },
    };

    const sortBy = query.sortBy ?? "journalDate";
    const sortOrder = query.sortOrder ?? "asc";

    const allPeriodLines = await repositoryFindMany(
      this.runner,
      (db) =>
        db.journalEntryLine.findMany({
          where: periodWhere,
          include: {
            journalEntry: true,
          },
          orderBy: [
            { journalEntry: { [sortBy]: sortOrder } },
            { sortOrder: "asc" },
          ],
        }),
      { model: MODEL, operation: "getAccountLedger.period" },
    );

    let running = openingBalance;
    const mapped = allPeriodLines.map((line) => {
      const debit = decimalToNumber(line.debit);
      const credit = decimalToNumber(line.credit);
      const delta = isDebitNormal(account.accountType)
        ? calculateDebitCreditNet(debit, credit)
        : roundMoney(credit - debit);
      running = roundMoney(running + delta);

      return {
        journalEntryId: line.journalEntryId,
        journalNumber: line.journalEntry.journalNumber,
        journalDate: line.journalEntry.journalDate,
        description: line.journalEntry.description,
        referenceType: line.journalEntry.referenceType,
        referenceId: line.journalEntry.referenceId,
        memo: line.memo,
        debit,
        credit,
        runningBalance: running,
      };
    });

    const total = mapped.length;
    const start = (query.page - 1) * query.pageSize;
    const entries = mapped.slice(start, start + query.pageSize);
    const closingBalance =
      mapped.length > 0
        ? mapped[mapped.length - 1]!.runningBalance
        : openingBalance;

    return {
      accountId: account.id,
      accountCode: account.accountCode,
      accountName: account.name,
      accountType: account.accountType,
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      openingBalance,
      closingBalance,
      entries,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: totalPages(total, query.pageSize),
    };
  }

  async getJournalReport(query: JournalReportQuery): Promise<JournalReport> {
    const dateFilter = buildJournalDateFilter(query.dateFrom, query.dateTo);
    const where: Prisma.JournalEntryWhereInput = {
      ...(dateFilter !== undefined ? { journalDate: dateFilter } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.search !== undefined && query.search.length > 0
        ? {
            OR: [
              {
                journalNumber: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? "journalDate";
    const sortOrder = query.sortOrder ?? "desc";

    const [total, journals] = await this.runner.run(
      async (db) => {
        const count = await db.journalEntry.count({ where });
        const items = await db.journalEntry.findMany({
          where,
          include: {
            lines: {
              include: { account: true },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return [count, items] as const;
      },
      { model: MODEL, operation: "getJournalReport" },
    );

    return {
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      items: journals.map((journal) => {
        const lines = journal.lines.map((line) => ({
          accountId: line.accountId,
          accountCode: line.account.accountCode,
          accountName: line.account.name,
          debit: decimalToNumber(line.debit),
          credit: decimalToNumber(line.credit),
          memo: line.memo,
          sortOrder: line.sortOrder,
        }));
        const debitTotal = roundMoney(
          lines.reduce((sum, line) => sum + line.debit, 0),
        );
        const creditTotal = roundMoney(
          lines.reduce((sum, line) => sum + line.credit, 0),
        );

        return {
          id: journal.id,
          journalNumber: journal.journalNumber,
          journalDate: journal.journalDate,
          status: journal.status,
          description: journal.description,
          referenceType: journal.referenceType,
          referenceId: journal.referenceId,
          lines,
          debitTotal,
          creditTotal,
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
    const dateFilter = buildJournalDateFilter(query.dateFrom, query.dateTo);

    const [cashReceiptsRaw, cashPaymentsRaw] = await this.runner.run(
      async (db) => {
        const payments = await db.payment.aggregate({
          where: {
            status: "POSTED",
            ...(dateFilter !== undefined ? { paymentDate: dateFilter } : {}),
          },
          _sum: { amount: true },
        });

        const expenseLines = await db.journalEntryLine.findMany({
          where: {
            account: { accountType: "EXPENSE" },
            journalEntry: {
              status: FINANCIAL_REPORT_POSTED_STATUS,
              ...(dateFilter !== undefined
                ? { journalDate: dateFilter }
                : {}),
            },
          },
          select: { debit: true },
        });

        return [payments, expenseLines] as const;
      },
      { model: MODEL, operation: "getCashFlowSummary" },
    );

    const cashReceipts = roundMoney(
      decimalToNumber(cashReceiptsRaw._sum.amount ?? 0),
    );
    const cashPayments = roundMoney(
      cashPaymentsRaw.reduce(
        (sum, line) => sum + decimalToNumber(line.debit),
        0,
      ),
    );
    const adjustments = 0;
    const cashFromOperations = roundMoney(profitLoss.netProfit + adjustments);

    return {
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      netIncome: profitLoss.netProfit,
      adjustments,
      cashFromOperations,
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
    const accounts = await repositoryFindMany(
      this.runner,
      (db) =>
        db.account.findMany({
          select: {
            accountType: true,
            isActive: true,
          },
        }),
      { model: MODEL, operation: "getAccountsSummary" },
    );

    const activeAccounts = accounts.filter((row) => row.isActive).length;
    const inactiveAccounts = accounts.length - activeAccounts;

    const typeMap = new Map<AccountType, number>();
    for (const account of accounts) {
      typeMap.set(
        account.accountType,
        (typeMap.get(account.accountType) ?? 0) + 1,
      );
    }

    const accountsByType = (
      ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const
    ).map((accountType) => ({
      accountType,
      count: typeMap.get(accountType) ?? 0,
    }));

    return {
      activeAccounts,
      inactiveAccounts,
      totalAccounts: accounts.length,
      accountsByType,
    };
  }

  async getAccountBalanceAggregates(
    query: TrialBalanceQuery,
  ): Promise<AccountBalanceAggregate[]> {
    const dateFilter = buildJournalDateFilter(query.dateFrom, query.dateTo);

    const accounts = await repositoryFindMany(
      this.runner,
      (db) =>
        db.account.findMany({
          orderBy: { accountCode: "asc" },
        }),
      { model: MODEL, operation: "getAccountBalanceAggregates.accounts" },
    );

    const lines = await repositoryFindMany(
      this.runner,
      (db) =>
        db.journalEntryLine.findMany({
          where: {
            journalEntry: {
              status: FINANCIAL_REPORT_POSTED_STATUS,
              ...(dateFilter !== undefined
                ? { journalDate: dateFilter }
                : {}),
            },
          },
          select: {
            accountId: true,
            debit: true,
            credit: true,
          },
        }),
      { model: MODEL, operation: "getAccountBalanceAggregates.lines" },
    );

    const totals = new Map<string, { debit: number; credit: number }>();
    for (const line of lines) {
      const current = totals.get(line.accountId) ?? { debit: 0, credit: 0 };
      current.debit = roundMoney(current.debit + decimalToNumber(line.debit));
      current.credit = roundMoney(
        current.credit + decimalToNumber(line.credit),
      );
      totals.set(line.accountId, current);
    }

    return accounts.map((account) => {
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
}

function isDebitNormal(accountType: AccountType): boolean {
  return accountType === "ASSET" || accountType === "EXPENSE";
}
