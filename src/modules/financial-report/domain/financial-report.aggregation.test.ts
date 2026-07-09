import { describe, expect, it } from "vitest";

import {
  buildTrialBalanceLines,
  buildTrialBalanceReport,
  calculateEndingBalance,
  roundMoney,
  withBalanceSheetEquation,
} from "./financial-report.rules";

describe("trial balance balancing", () => {
  it("balances a double-entry revenue recognition set", () => {
    const report = buildTrialBalanceReport(
      buildTrialBalanceLines([
        {
          accountId: "ar",
          accountCode: "1100",
          accountName: "AR",
          accountType: "ASSET",
          totalDebit: 1000,
          totalCredit: 0,
        },
        {
          accountId: "rev",
          accountCode: "4000",
          accountName: "Revenue",
          accountType: "INCOME",
          totalDebit: 0,
          totalCredit: 1000,
        },
      ]),
      new Date("2026-01-01"),
      new Date("2026-01-31"),
    );

    expect(report.isBalanced).toBe(true);
    expect(report.totalDebit).toBe(report.totalCredit);
  });

  it("balances multi-account expense and revenue activity", () => {
    const report = buildTrialBalanceReport(
      buildTrialBalanceLines([
        {
          accountId: "cash",
          accountCode: "1000",
          accountName: "Cash",
          accountType: "ASSET",
          totalDebit: 0,
          totalCredit: 300,
        },
        {
          accountId: "ar",
          accountCode: "1100",
          accountName: "AR",
          accountType: "ASSET",
          totalDebit: 1000,
          totalCredit: 0,
        },
        {
          accountId: "rev",
          accountCode: "4000",
          accountName: "Revenue",
          accountType: "INCOME",
          totalDebit: 0,
          totalCredit: 1000,
        },
        {
          accountId: "exp",
          accountCode: "5000",
          accountName: "Expense",
          accountType: "EXPENSE",
          totalDebit: 300,
          totalCredit: 0,
        },
      ]),
      null,
      null,
    );

    expect(report.totalDebit).toBe(1300);
    expect(report.totalCredit).toBe(1300);
    expect(report.isBalanced).toBe(true);
  });

  it("includes zero-activity accounts with zero balances", () => {
    const lines = buildTrialBalanceLines([
      {
        accountId: "eq",
        accountCode: "3000",
        accountName: "Equity",
        accountType: "EQUITY",
        totalDebit: 0,
        totalCredit: 0,
      },
    ]);

    expect(lines[0]!.endingBalance).toBe(0);
  });
});

describe("profit and loss calculations", () => {
  it("computes net profit as revenue minus expenses", () => {
    const revenue = calculateEndingBalance("INCOME", 0, 1000);
    const expenses = calculateEndingBalance("EXPENSE", 300, 0);
    expect(roundMoney(revenue - expenses)).toBe(700);
  });

  it("computes net loss when expenses exceed revenue", () => {
    const revenue = calculateEndingBalance("INCOME", 0, 200);
    const expenses = calculateEndingBalance("EXPENSE", 500, 0);
    expect(roundMoney(revenue - expenses)).toBe(-300);
  });

  it("handles zero activity period", () => {
    expect(roundMoney(0 - 0)).toBe(0);
  });
});

describe("balance sheet equation tests", () => {
  it("balances assets with liabilities equity and retained earnings", () => {
    const assets = 700;
    const liabilities = 0;
    const equity = 0;
    const netIncome = 700;

    const report = withBalanceSheetEquation({
      asOfDate: new Date("2026-01-31"),
      assets: { accounts: [], total: assets },
      liabilities: { accounts: [], total: liabilities },
      equity: {
        accounts: [],
        total: roundMoney(equity + netIncome),
      },
      totalAssets: assets,
      totalLiabilities: liabilities,
      totalEquity: roundMoney(equity + netIncome),
      netIncome,
    });

    expect(report.isBalanced).toBe(true);
    expect(report.totalAssets).toBe(
      roundMoney(report.totalLiabilities + report.totalEquity),
    );
  });

  it("fails equation when net income omitted from equity", () => {
    const report = withBalanceSheetEquation({
      asOfDate: null,
      assets: { accounts: [], total: 700 },
      liabilities: { accounts: [], total: 0 },
      equity: { accounts: [], total: 0 },
      totalAssets: 700,
      totalLiabilities: 0,
      totalEquity: 0,
      netIncome: 700,
    });

    expect(report.isBalanced).toBe(false);
  });
});
