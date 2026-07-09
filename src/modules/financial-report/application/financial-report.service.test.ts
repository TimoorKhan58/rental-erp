import { describe, expect, it, vi } from "vitest";

import { FinancialReportService } from "@/modules/financial-report/application/services/financial-report.service";

function createService() {
  const getTrialBalance = { execute: vi.fn().mockResolvedValue({ type: "tb" }) };
  const getBalanceSheet = { execute: vi.fn().mockResolvedValue({ type: "bs" }) };
  const getProfitLoss = { execute: vi.fn().mockResolvedValue({ type: "pl" }) };
  const getGeneralLedger = { execute: vi.fn().mockResolvedValue({ type: "gl" }) };
  const getAccountLedger = { execute: vi.fn().mockResolvedValue({ type: "al" }) };
  const getJournalReport = { execute: vi.fn().mockResolvedValue({ type: "jr" }) };
  const getCashFlowSummary = {
    execute: vi.fn().mockResolvedValue({ type: "cf" }),
  };
  const getRevenueSummary = {
    execute: vi.fn().mockResolvedValue({ type: "rev" }),
  };
  const getExpenseSummary = {
    execute: vi.fn().mockResolvedValue({ type: "exp" }),
  };
  const getAccountsSummary = {
    execute: vi.fn().mockResolvedValue({ type: "acc" }),
  };

  const service = new FinancialReportService(
    getTrialBalance as never,
    getBalanceSheet as never,
    getProfitLoss as never,
    getGeneralLedger as never,
    getAccountLedger as never,
    getJournalReport as never,
    getCashFlowSummary as never,
    getRevenueSummary as never,
    getExpenseSummary as never,
    getAccountsSummary as never,
  );

  return {
    service,
    getTrialBalance,
    getBalanceSheet,
    getProfitLoss,
    getGeneralLedger,
    getAccountLedger,
    getJournalReport,
    getCashFlowSummary,
    getRevenueSummary,
    getExpenseSummary,
    getAccountsSummary,
  };
}

describe("FinancialReportService facade", () => {
  it("delegates getTrialBalance", async () => {
    const { service, getTrialBalance } = createService();
    await expect(service.getTrialBalance({})).resolves.toEqual({ type: "tb" });
    expect(getTrialBalance.execute).toHaveBeenCalledWith({});
  });

  it("delegates getBalanceSheet", async () => {
    const { service, getBalanceSheet } = createService();
    await expect(service.getBalanceSheet({})).resolves.toEqual({ type: "bs" });
    expect(getBalanceSheet.execute).toHaveBeenCalled();
  });

  it("delegates getProfitLoss", async () => {
    const { service, getProfitLoss } = createService();
    await expect(service.getProfitLoss({})).resolves.toEqual({ type: "pl" });
    expect(getProfitLoss.execute).toHaveBeenCalled();
  });

  it("delegates getGeneralLedger", async () => {
    const { service, getGeneralLedger } = createService();
    await expect(
      service.getGeneralLedger({
        accountId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual({ type: "gl" });
    expect(getGeneralLedger.execute).toHaveBeenCalled();
  });

  it("delegates getAccountLedger", async () => {
    const { service, getAccountLedger } = createService();
    await expect(
      service.getAccountLedger({
        accountId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual({ type: "al" });
    expect(getAccountLedger.execute).toHaveBeenCalled();
  });

  it("delegates getJournalReport", async () => {
    const { service, getJournalReport } = createService();
    await expect(service.getJournalReport({})).resolves.toEqual({ type: "jr" });
    expect(getJournalReport.execute).toHaveBeenCalled();
  });

  it("delegates getCashFlowSummary", async () => {
    const { service, getCashFlowSummary } = createService();
    await expect(service.getCashFlowSummary({})).resolves.toEqual({
      type: "cf",
    });
    expect(getCashFlowSummary.execute).toHaveBeenCalled();
  });

  it("delegates getRevenueSummary", async () => {
    const { service, getRevenueSummary } = createService();
    await expect(service.getRevenueSummary({})).resolves.toEqual({
      type: "rev",
    });
    expect(getRevenueSummary.execute).toHaveBeenCalled();
  });

  it("delegates getExpenseSummary", async () => {
    const { service, getExpenseSummary } = createService();
    await expect(service.getExpenseSummary({})).resolves.toEqual({
      type: "exp",
    });
    expect(getExpenseSummary.execute).toHaveBeenCalled();
  });

  it("delegates getAccountsSummary", async () => {
    const { service, getAccountsSummary } = createService();
    await expect(service.getAccountsSummary()).resolves.toEqual({
      type: "acc",
    });
    expect(getAccountsSummary.execute).toHaveBeenCalled();
  });
});
