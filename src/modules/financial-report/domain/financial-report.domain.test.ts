import { describe, expect, it } from "vitest";

import {
  amountsEqual,
  buildTrialBalanceLines,
  buildTrialBalanceReport,
  calculateDebitCreditNet,
  calculateEndingBalance,
  isBalanceSheetBalanced,
  isCreditNormalAccount,
  isDebitNormalAccount,
  roundMoney,
  withBalanceSheetEquation,
} from "./financial-report.rules";
import {
  FINANCIAL_REPORT_MODULE,
  FINANCIAL_REPORT_POSTED_STATUS,
  JOURNAL_REPORT_SORT_FIELDS,
  LEDGER_SORT_FIELDS,
} from "./financial-report.constants";
import {
  FinancialReportDomainError,
  UnbalancedBalanceSheetError,
  UnbalancedTrialBalanceError,
} from "./financial-report.errors";

describe("financial-report constants", () => {
  it("exposes module name", () => {
    expect(FINANCIAL_REPORT_MODULE).toBe("financial-reports");
  });

  it("uses POSTED status for report aggregation", () => {
    expect(FINANCIAL_REPORT_POSTED_STATUS).toBe("POSTED");
  });

  it("defines ledger sort fields", () => {
    expect(LEDGER_SORT_FIELDS).toContain("journalDate");
    expect(LEDGER_SORT_FIELDS).toContain("journalNumber");
  });

  it("defines journal report sort fields", () => {
    expect(JOURNAL_REPORT_SORT_FIELDS).toContain("status");
  });
});

describe("financial-report errors", () => {
  it("creates domain error", () => {
    const error = new FinancialReportDomainError("boom");
    expect(error.message).toBe("boom");
    expect(error.name).toBe("FinancialReportDomainError");
  });

  it("creates unbalanced trial balance error", () => {
    const error = new UnbalancedTrialBalanceError();
    expect(error).toBeInstanceOf(FinancialReportDomainError);
  });

  it("creates unbalanced balance sheet error", () => {
    const error = new UnbalancedBalanceSheetError();
    expect(error).toBeInstanceOf(FinancialReportDomainError);
  });
});

describe("roundMoney", () => {
  it("rounds to two decimal places", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1);
  });
});

describe("account normal balances", () => {
  it("treats asset and expense as debit-normal", () => {
    expect(isDebitNormalAccount("ASSET")).toBe(true);
    expect(isDebitNormalAccount("EXPENSE")).toBe(true);
    expect(isDebitNormalAccount("INCOME")).toBe(false);
  });

  it("treats liability equity income as credit-normal", () => {
    expect(isCreditNormalAccount("LIABILITY")).toBe(true);
    expect(isCreditNormalAccount("EQUITY")).toBe(true);
    expect(isCreditNormalAccount("INCOME")).toBe(true);
    expect(isCreditNormalAccount("ASSET")).toBe(false);
  });
});

describe("calculateEndingBalance", () => {
  it("computes debit-normal ending balance", () => {
    expect(calculateEndingBalance("ASSET", 1000, 250)).toBe(750);
  });

  it("computes credit-normal ending balance", () => {
    expect(calculateEndingBalance("INCOME", 100, 1000)).toBe(900);
  });

  it("computes liability ending balance", () => {
    expect(calculateEndingBalance("LIABILITY", 50, 200)).toBe(150);
  });

  it("computes expense ending balance", () => {
    expect(calculateEndingBalance("EXPENSE", 300, 0)).toBe(300);
  });
});

describe("calculateDebitCreditNet", () => {
  it("returns debit minus credit", () => {
    expect(calculateDebitCreditNet(100, 40)).toBe(60);
  });
});

describe("amountsEqual", () => {
  it("compares within rounding tolerance", () => {
    expect(amountsEqual(100, 100)).toBe(true);
    expect(amountsEqual(100, 100.001)).toBe(true);
    expect(amountsEqual(100, 101)).toBe(false);
  });
});

describe("trial balance builders", () => {
  it("builds sorted trial balance lines with ending balances", () => {
    const lines = buildTrialBalanceLines([
      {
        accountId: "2",
        accountCode: "4000",
        accountName: "Revenue",
        accountType: "INCOME",
        totalDebit: 0,
        totalCredit: 1000,
      },
      {
        accountId: "1",
        accountCode: "1000",
        accountName: "Cash",
        accountType: "ASSET",
        totalDebit: 1000,
        totalCredit: 0,
      },
    ]);

    expect(lines[0]!.accountCode).toBe("1000");
    expect(lines[0]!.endingBalance).toBe(1000);
    expect(lines[1]!.endingBalance).toBe(1000);
  });

  it("marks trial balance as balanced when totals match", () => {
    const report = buildTrialBalanceReport(
      buildTrialBalanceLines([
        {
          accountId: "1",
          accountCode: "1000",
          accountName: "Cash",
          accountType: "ASSET",
          totalDebit: 500,
          totalCredit: 0,
        },
        {
          accountId: "2",
          accountCode: "4000",
          accountName: "Revenue",
          accountType: "INCOME",
          totalDebit: 0,
          totalCredit: 500,
        },
      ]),
      null,
      null,
    );

    expect(report.totalDebit).toBe(500);
    expect(report.totalCredit).toBe(500);
    expect(report.isBalanced).toBe(true);
  });

  it("marks trial balance as unbalanced when totals differ", () => {
    const report = buildTrialBalanceReport(
      [
        {
          accountId: "1",
          accountCode: "1000",
          accountName: "Cash",
          accountType: "ASSET",
          totalDebit: 500,
          totalCredit: 0,
          endingBalance: 500,
        },
      ],
      null,
      null,
    );

    expect(report.isBalanced).toBe(false);
  });
});

describe("balance sheet equation", () => {
  it("validates assets equal liabilities plus equity", () => {
    expect(
      isBalanceSheetBalanced({
        totalAssets: 1000,
        totalLiabilities: 400,
        totalEquity: 600,
      }),
    ).toBe(true);
  });

  it("fails when equation does not hold", () => {
    expect(
      isBalanceSheetBalanced({
        totalAssets: 1000,
        totalLiabilities: 400,
        totalEquity: 500,
      }),
    ).toBe(false);
  });

  it("attaches isBalanced flag", () => {
    const report = withBalanceSheetEquation({
      asOfDate: null,
      assets: { accounts: [], total: 100 },
      liabilities: { accounts: [], total: 40 },
      equity: { accounts: [], total: 60 },
      totalAssets: 100,
      totalLiabilities: 40,
      totalEquity: 60,
      netIncome: 0,
    });

    expect(report.isBalanced).toBe(true);
  });
});
