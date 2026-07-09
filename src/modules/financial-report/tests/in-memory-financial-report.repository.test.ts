import { describe, expect, it } from "vitest";

import {
  AR_ACCOUNT_ID,
  CASH_ACCOUNT_ID,
  buildDraftJournal,
  buildPostedExpenseJournal,
  buildPostedPayment,
  buildPostedRevenueJournal,
  buildStandardAccounts,
} from "./helpers/financial-report.fixtures";
import { InMemoryFinancialReportRepository } from "./helpers/in-memory-financial-report.repository";

function createRepo() {
  const repository = new InMemoryFinancialReportRepository();
  repository.seed({
    accounts: buildStandardAccounts(),
    journals: [
      buildPostedRevenueJournal(),
      buildPostedExpenseJournal(),
      buildDraftJournal(),
    ],
    payments: [buildPostedPayment()],
  });
  return repository;
}

describe("InMemoryFinancialReportRepository", () => {
  it("ignores draft journals in trial balance", async () => {
    const report = await createRepo().getTrialBalance({});
    expect(report.isBalanced).toBe(true);
    expect(report.totalDebit).toBe(1300);
  });

  it("filters trial balance by date", async () => {
    const report = await createRepo().getTrialBalance({
      dateFrom: new Date("2026-01-01"),
      dateTo: new Date("2026-01-16"),
    });
    expect(report.totalDebit).toBe(1000);
  });

  it("builds balance sheet equation", async () => {
    const report = await createRepo().getBalanceSheet({
      asOfDate: new Date("2026-01-31"),
    });
    expect(report.isBalanced).toBe(true);
    expect(report.totalAssets).toBe(
      report.totalLiabilities + report.totalEquity,
    );
  });

  it("computes profit and loss", async () => {
    const report = await createRepo().getProfitLoss({});
    expect(report.netProfit).toBe(700);
  });

  it("computes account ledger opening and closing", async () => {
    const report = await createRepo().getAccountLedger({
      accountId: CASH_ACCOUNT_ID,
      page: 1,
      pageSize: 20,
      dateFrom: new Date("2026-01-19"),
      dateTo: new Date("2026-01-31"),
    });
    expect(report.openingBalance).toBe(0);
    expect(report.closingBalance).toBe(-300);
  });

  it("paginates journal report", async () => {
    const report = await createRepo().getJournalReport({
      page: 1,
      pageSize: 1,
      sortBy: "journalDate",
      sortOrder: "asc",
    });
    expect(report.items).toHaveLength(1);
    expect(report.totalPages).toBeGreaterThan(1);
  });

  it("searches journal report", async () => {
    const report = await createRepo().getJournalReport({
      page: 1,
      pageSize: 20,
      search: "expense",
    });
    expect(report.items).toHaveLength(1);
    expect(report.items[0]!.journalNumber).toBe("JE-002");
  });

  it("returns cash flow summary from payments and expenses", async () => {
    const report = await createRepo().getCashFlowSummary({});
    expect(report.cashReceipts).toBe(500);
    expect(report.cashPayments).toBe(300);
  });

  it("returns revenue and expense summaries", async () => {
    const repo = createRepo();
    const revenue = await repo.getRevenueSummary({});
    const expenses = await repo.getExpenseSummary({});
    expect(revenue.totalRevenue).toBe(1000);
    expect(expenses.totalExpenses).toBe(300);
  });

  it("returns accounts summary by type", async () => {
    const report = await createRepo().getAccountsSummary({});
    expect(report.totalAccounts).toBe(6);
    expect(
      report.accountsByType.find((row) => row.accountType === "INCOME")?.count,
    ).toBe(1);
  });

  it("general ledger delegates to account ledger", async () => {
    const report = await createRepo().getGeneralLedger({
      accountId: AR_ACCOUNT_ID,
      page: 1,
      pageSize: 10,
    });
    expect(report.accountId).toBe(AR_ACCOUNT_ID);
    expect(report.entries.length).toBe(1);
  });

  it("clears seeded data", async () => {
    const repo = createRepo();
    repo.clear();
    const report = await repo.getAccountsSummary({});
    expect(report.totalAccounts).toBe(0);
  });
});
