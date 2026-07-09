import { describe, expect, it } from "vitest";

import { GetJournalReportService } from "@/modules/financial-report/application/services/get-journal-report.service";
import { GetProfitLossService } from "@/modules/financial-report/application/services/get-profit-loss.service";
import { GetTrialBalanceService } from "@/modules/financial-report/application/services/get-trial-balance.service";

import {
  buildDraftJournal,
  buildPostedExpenseJournal,
  buildPostedRevenueJournal,
  buildStandardAccounts,
} from "./helpers/financial-report.fixtures";
import { InMemoryFinancialReportRepository } from "./helpers/in-memory-financial-report.repository";

function seed() {
  const repository = new InMemoryFinancialReportRepository();
  repository.seed({
    accounts: buildStandardAccounts(),
    journals: [
      buildPostedRevenueJournal(),
      buildPostedExpenseJournal(),
      buildDraftJournal(),
    ],
  });
  return repository;
}

describe("date filter tests", () => {
  it("includes only journals on or after dateFrom", async () => {
    const service = new GetJournalReportService(seed());
    const result = await service.execute({
      dateFrom: "2026-01-20",
      status: "POSTED",
    });
    expect(result.items.map((item) => item.journalNumber)).toEqual(["JE-002"]);
  });

  it("includes only journals on or before dateTo", async () => {
    const service = new GetJournalReportService(seed());
    const result = await service.execute({
      dateTo: "2026-01-15",
      status: "POSTED",
    });
    expect(result.items.map((item) => item.journalNumber)).toEqual(["JE-001"]);
  });

  it("includes journals within inclusive date range", async () => {
    const service = new GetTrialBalanceService(seed());
    const result = await service.execute({
      dateFrom: "2026-01-15",
      dateTo: "2026-01-20",
    });
    expect(result.totalDebit).toBe(1300);
  });

  it("excludes journals outside date range from profit loss", async () => {
    const service = new GetProfitLossService(seed());
    const result = await service.execute({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-16",
    });
    expect(result.totalRevenue).toBe(1000);
    expect(result.totalExpenses).toBe(0);
    expect(result.netProfit).toBe(1000);
  });

  it("returns empty activity for future date range", async () => {
    const service = new GetTrialBalanceService(seed());
    const result = await service.execute({
      dateFrom: "2027-01-01",
      dateTo: "2027-01-31",
    });
    expect(result.totalDebit).toBe(0);
    expect(result.totalCredit).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  it("does not include draft journals even when dates match", async () => {
    const service = new GetTrialBalanceService(seed());
    const result = await service.execute({
      dateFrom: "2026-01-25",
      dateTo: "2026-01-25",
    });
    expect(result.totalDebit).toBe(0);
  });
});
