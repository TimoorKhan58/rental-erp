import { describe, expect, it } from "vitest";

import { GetExpenseSummaryService } from "@/modules/financial-report/application/services/get-expense-summary.service";
import { GetProfitLossService } from "@/modules/financial-report/application/services/get-profit-loss.service";
import { GetRevenueSummaryService } from "@/modules/financial-report/application/services/get-revenue-summary.service";

import {
  EXPENSE_ACCOUNT_ID,
  REVENUE_ACCOUNT_ID,
  buildPostedExpenseJournal,
  buildPostedRevenueJournal,
  buildStandardAccounts,
} from "./helpers/financial-report.fixtures";
import { InMemoryFinancialReportRepository } from "./helpers/in-memory-financial-report.repository";

function seed() {
  const repository = new InMemoryFinancialReportRepository();
  repository.seed({
    accounts: buildStandardAccounts(),
    journals: [buildPostedRevenueJournal(), buildPostedExpenseJournal()],
  });
  return repository;
}

describe("profit and loss calculation tests", () => {
  it("aggregates revenue lines", async () => {
    const result = await new GetProfitLossService(seed()).execute({});
    expect(result.revenue).toHaveLength(1);
    expect(result.revenue[0]!.accountId).toBe(REVENUE_ACCOUNT_ID);
    expect(result.revenue[0]!.amount).toBe(1000);
  });

  it("aggregates expense lines", async () => {
    const result = await new GetProfitLossService(seed()).execute({});
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0]!.accountId).toBe(EXPENSE_ACCOUNT_ID);
    expect(result.expenses[0]!.amount).toBe(300);
  });

  it("computes net profit", async () => {
    const result = await new GetProfitLossService(seed()).execute({});
    expect(result.netProfit).toBe(700);
  });

  it("computes net loss", async () => {
    const repository = new InMemoryFinancialReportRepository();
    repository.seed({
      accounts: buildStandardAccounts(),
      journals: [
        buildPostedExpenseJournal(),
        buildPostedExpenseJournal({
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          journalNumber: "JE-010",
          journalDate: new Date("2026-01-21T00:00:00.000Z"),
        }),
      ],
    });

    const result = await new GetProfitLossService(repository).execute({});
    expect(result.totalRevenue).toBe(0);
    expect(result.totalExpenses).toBe(600);
    expect(result.netProfit).toBe(-600);
  });

  it("aligns revenue summary with profit loss revenue", async () => {
    const repository = seed();
    const pl = await new GetProfitLossService(repository).execute({});
    const revenue = await new GetRevenueSummaryService(repository).execute({});
    expect(revenue.totalRevenue).toBe(pl.totalRevenue);
    expect(revenue.lines).toEqual(pl.revenue);
  });

  it("aligns expense summary with profit loss expenses", async () => {
    const repository = seed();
    const pl = await new GetProfitLossService(repository).execute({});
    const expenses = await new GetExpenseSummaryService(repository).execute({});
    expect(expenses.totalExpenses).toBe(pl.totalExpenses);
    expect(expenses.lines).toEqual(pl.expenses);
  });

  it("supports date-bounded profit loss", async () => {
    const result = await new GetProfitLossService(seed()).execute({
      dateFrom: "2026-01-19",
      dateTo: "2026-01-31",
    });
    expect(result.totalRevenue).toBe(0);
    expect(result.totalExpenses).toBe(300);
    expect(result.netProfit).toBe(-300);
  });
});
