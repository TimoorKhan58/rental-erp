import { describe, expect, it } from "vitest";

import {
  toAccountLedgerDto,
  toAccountLedgerQuery,
  toAccountsSummaryDto,
  toAccountsSummaryQuery,
  toBalanceSheetDto,
  toBalanceSheetQuery,
  toCashFlowSummaryDto,
  toCashFlowSummaryQuery,
  toExpenseSummaryDto,
  toExpenseSummaryQuery,
  toGeneralLedgerDto,
  toGeneralLedgerQuery,
  toJournalReportDto,
  toJournalReportQuery,
  toProfitLossDto,
  toProfitLossQuery,
  toRevenueSummaryDto,
  toRevenueSummaryQuery,
  toTrialBalanceDto,
  toTrialBalanceQuery,
} from "@/modules/financial-report/application/mappers/financial-report.mapper";

import { CASH_ACCOUNT_ID } from "../tests/helpers/financial-report.fixtures";

describe("financial report mappers", () => {
  it("maps trial balance query and dto", () => {
    const dateFrom = new Date("2026-01-01");
    const dateTo = new Date("2026-01-31");
    expect(toTrialBalanceQuery({ dateFrom, dateTo })).toEqual({
      dateFrom,
      dateTo,
    });

    const dto = toTrialBalanceDto({
      dateFrom,
      dateTo,
      lines: [
        {
          accountId: CASH_ACCOUNT_ID,
          accountCode: "1000",
          accountName: "Cash",
          accountType: "ASSET",
          totalDebit: 10,
          totalCredit: 0,
          endingBalance: 10,
        },
      ],
      totalDebit: 10,
      totalCredit: 10,
      isBalanced: true,
    });

    expect(dto.dateFrom).toBe(dateFrom.toISOString());
    expect(dto.lines[0]!.accountCode).toBe("1000");
  });

  it("maps balance sheet query and dto", () => {
    const asOfDate = new Date("2026-01-31");
    expect(toBalanceSheetQuery({ asOfDate })).toEqual({ asOfDate });

    const dto = toBalanceSheetDto({
      asOfDate,
      assets: { accounts: [], total: 100 },
      liabilities: { accounts: [], total: 40 },
      equity: { accounts: [], total: 60 },
      totalAssets: 100,
      totalLiabilities: 40,
      totalEquity: 60,
      netIncome: 0,
      isBalanced: true,
    });

    expect(dto.asOfDate).toBe(asOfDate.toISOString());
    expect(dto.isBalanced).toBe(true);
  });

  it("maps profit loss query and dto", () => {
    const query = toProfitLossQuery({});
    expect(query).toEqual({});

    const dto = toProfitLossDto({
      dateFrom: null,
      dateTo: null,
      revenue: [],
      expenses: [],
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
    });
    expect(dto.netProfit).toBe(0);
  });

  it("maps ledger queries and dtos", () => {
    const input = {
      accountId: CASH_ACCOUNT_ID,
      page: 1,
      pageSize: 20,
      sortOrder: "asc" as const,
    };
    expect(toAccountLedgerQuery(input).accountId).toBe(CASH_ACCOUNT_ID);
    expect(toGeneralLedgerQuery(input).accountId).toBe(CASH_ACCOUNT_ID);

    const report = {
      accountId: CASH_ACCOUNT_ID,
      accountCode: "1000",
      accountName: "Cash",
      accountType: "ASSET" as const,
      dateFrom: null,
      dateTo: null,
      openingBalance: 0,
      closingBalance: 10,
      entries: [
        {
          journalEntryId: "j1",
          journalNumber: "JE-1",
          journalDate: new Date("2026-01-01"),
          description: "x",
          referenceType: null,
          referenceId: null,
          memo: null,
          debit: 10,
          credit: 0,
          runningBalance: 10,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    };

    expect(toAccountLedgerDto(report).entries[0]!.journalDate).toContain(
      "2026-01-01",
    );
    expect(toGeneralLedgerDto(report).closingBalance).toBe(10);
  });

  it("maps journal report query and dto", () => {
    expect(
      toJournalReportQuery({
        page: 1,
        pageSize: 20,
        sortOrder: "asc",
        search: "JE",
        status: "POSTED",
      }).search,
    ).toBe("JE");

    const dto = toJournalReportDto({
      dateFrom: null,
      dateTo: null,
      items: [
        {
          id: "1",
          journalNumber: "JE-1",
          journalDate: new Date("2026-01-01"),
          status: "POSTED",
          description: "desc",
          referenceType: null,
          referenceId: null,
          lines: [],
          debitTotal: 0,
          creditTotal: 0,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(dto.items[0]!.journalNumber).toBe("JE-1");
  });

  it("maps summary queries and dtos", () => {
    expect(toCashFlowSummaryQuery({})).toEqual({});
    expect(toRevenueSummaryQuery({})).toEqual({});
    expect(toExpenseSummaryQuery({})).toEqual({});
    expect(toAccountsSummaryQuery({})).toEqual({});

    expect(
      toCashFlowSummaryDto({
        dateFrom: null,
        dateTo: null,
        netIncome: 1,
        adjustments: 0,
        cashFromOperations: 1,
        cashReceipts: 2,
        cashPayments: 1,
        netCashChange: 1,
      }).netCashChange,
    ).toBe(1);

    expect(
      toRevenueSummaryDto({
        dateFrom: null,
        dateTo: null,
        lines: [],
        totalRevenue: 5,
      }).totalRevenue,
    ).toBe(5);

    expect(
      toExpenseSummaryDto({
        dateFrom: null,
        dateTo: null,
        lines: [],
        totalExpenses: 3,
      }).totalExpenses,
    ).toBe(3);

    expect(
      toAccountsSummaryDto({
        activeAccounts: 1,
        inactiveAccounts: 0,
        totalAccounts: 1,
        accountsByType: [{ accountType: "ASSET", count: 1 }],
      }).totalAccounts,
    ).toBe(1);
  });
});
