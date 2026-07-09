import { describe, expect, it } from "vitest";

import { GetAccountLedgerService } from "@/modules/financial-report/application/services/get-account-ledger.service";
import { GetAccountsSummaryService } from "@/modules/financial-report/application/services/get-accounts-summary.service";
import { GetBalanceSheetService } from "@/modules/financial-report/application/services/get-balance-sheet.service";
import { GetCashFlowSummaryService } from "@/modules/financial-report/application/services/get-cash-flow-summary.service";
import { GetExpenseSummaryService } from "@/modules/financial-report/application/services/get-expense-summary.service";
import { GetGeneralLedgerService } from "@/modules/financial-report/application/services/get-general-ledger.service";
import { GetJournalReportService } from "@/modules/financial-report/application/services/get-journal-report.service";
import { GetProfitLossService } from "@/modules/financial-report/application/services/get-profit-loss.service";
import { GetRevenueSummaryService } from "@/modules/financial-report/application/services/get-revenue-summary.service";
import { GetTrialBalanceService } from "@/modules/financial-report/application/services/get-trial-balance.service";
import { NotFoundError, ValidationError } from "@/shared/infrastructure/errors";

import {
  AR_ACCOUNT_ID,
  CASH_ACCOUNT_ID,
  REVENUE_ACCOUNT_ID,
  buildDraftJournal,
  buildPostedExpenseJournal,
  buildPostedPayment,
  buildPostedRevenueJournal,
  buildStandardAccounts,
} from "../tests/helpers/financial-report.fixtures";
import { InMemoryFinancialReportRepository } from "../tests/helpers/in-memory-financial-report.repository";

function seedRepository() {
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

describe("GetTrialBalanceService", () => {
  it("returns balanced trial balance from posted journals only", async () => {
    const service = new GetTrialBalanceService(seedRepository());
    const result = await service.execute({});

    expect(result.isBalanced).toBe(true);
    expect(result.totalDebit).toBe(result.totalCredit);
    expect(result.lines.some((line) => line.accountCode === "1100")).toBe(true);
  });

  it("filters by date range", async () => {
    const service = new GetTrialBalanceService(seedRepository());
    const result = await service.execute({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-16",
    });

    const expense = result.lines.find((line) => line.accountCode === "5000");
    expect(expense?.totalDebit ?? 0).toBe(0);
  });

  it("rejects inverted dates", async () => {
    const service = new GetTrialBalanceService(seedRepository());
    await expect(
      service.execute({
        dateFrom: "2026-02-01",
        dateTo: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("GetBalanceSheetService", () => {
  it("returns balanced balance sheet including net income", async () => {
    const service = new GetBalanceSheetService(seedRepository());
    const result = await service.execute({ asOfDate: "2026-01-31" });

    expect(result.isBalanced).toBe(true);
    expect(result.totalAssets).toBe(
      result.totalLiabilities + result.totalEquity,
    );
    expect(result.netIncome).toBe(700);
  });

  it("supports as-of date filtering", async () => {
    const service = new GetBalanceSheetService(seedRepository());
    const early = await service.execute({ asOfDate: "2026-01-16" });
    expect(early.netIncome).toBe(1000);
  });
});

describe("GetProfitLossService", () => {
  it("computes revenue expenses and net profit", async () => {
    const service = new GetProfitLossService(seedRepository());
    const result = await service.execute({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(result.totalRevenue).toBe(1000);
    expect(result.totalExpenses).toBe(300);
    expect(result.netProfit).toBe(700);
  });

  it("returns zero profit for empty period", async () => {
    const service = new GetProfitLossService(seedRepository());
    const result = await service.execute({
      dateFrom: "2025-01-01",
      dateTo: "2025-01-31",
    });
    expect(result.netProfit).toBe(0);
  });
});

describe("GetGeneralLedgerService / GetAccountLedgerService", () => {
  it("returns opening running and closing balances", async () => {
    const service = new GetAccountLedgerService(seedRepository());
    const result = await service.execute({
      accountId: AR_ACCOUNT_ID,
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(result.openingBalance).toBe(0);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.runningBalance).toBe(1000);
    expect(result.closingBalance).toBe(1000);
  });

  it("paginates ledger entries", async () => {
    const repository = seedRepository();
    repository.seed({
      accounts: buildStandardAccounts(),
      journals: [
        buildPostedRevenueJournal(),
        buildPostedRevenueJournal({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          journalNumber: "JE-003",
          journalDate: new Date("2026-01-17T00:00:00.000Z"),
        }),
        buildPostedRevenueJournal({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
          journalNumber: "JE-004",
          journalDate: new Date("2026-01-18T00:00:00.000Z"),
        }),
      ],
    });

    const service = new GetAccountLedgerService(repository);
    const page1 = await service.execute({
      accountId: AR_ACCOUNT_ID,
      page: 1,
      pageSize: 2,
    });
    const page2 = await service.execute({
      accountId: AR_ACCOUNT_ID,
      page: 2,
      pageSize: 2,
    });

    expect(page1.entries).toHaveLength(2);
    expect(page2.entries).toHaveLength(1);
    expect(page1.total).toBe(3);
    expect(page1.totalPages).toBe(2);
  });

  it("throws not found for missing account", async () => {
    const service = new GetGeneralLedgerService(seedRepository());
    await expect(
      service.execute({
        accountId: "00000000-0000-4000-8000-000000000000",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("supports sorting", async () => {
    const service = new GetAccountLedgerService(seedRepository());
    const result = await service.execute({
      accountId: CASH_ACCOUNT_ID,
      sortBy: "journalNumber",
      sortOrder: "desc",
    });
    expect(result.accountId).toBe(CASH_ACCOUNT_ID);
  });
});

describe("GetJournalReportService", () => {
  it("returns journals with debit and credit totals", async () => {
    const service = new GetJournalReportService(seedRepository());
    const result = await service.execute({ status: "POSTED" });

    expect(result.items.length).toBe(2);
    expect(result.items[0]!.debitTotal).toBe(result.items[0]!.creditTotal);
  });

  it("supports search", async () => {
    const service = new GetJournalReportService(seedRepository());
    const result = await service.execute({ search: "JE-001" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.journalNumber).toBe("JE-001");
  });

  it("paginates journals", async () => {
    const service = new GetJournalReportService(seedRepository());
    const result = await service.execute({ page: 1, pageSize: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBeGreaterThan(1);
  });

  it("filters by date range", async () => {
    const service = new GetJournalReportService(seedRepository());
    const result = await service.execute({
      dateFrom: "2026-01-19",
      dateTo: "2026-01-21",
    });
    expect(result.items.every((item) => item.journalNumber === "JE-002")).toBe(
      true,
    );
  });
});

describe("summary services", () => {
  it("returns cash flow summary", async () => {
    const service = new GetCashFlowSummaryService(seedRepository());
    const result = await service.execute({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(result.netIncome).toBe(700);
    expect(result.cashReceipts).toBe(500);
    expect(result.cashPayments).toBe(300);
    expect(result.netCashChange).toBe(200);
  });

  it("returns revenue summary", async () => {
    const service = new GetRevenueSummaryService(seedRepository());
    const result = await service.execute({});
    expect(result.totalRevenue).toBe(1000);
    expect(result.lines[0]!.accountId).toBe(REVENUE_ACCOUNT_ID);
  });

  it("returns expense summary", async () => {
    const service = new GetExpenseSummaryService(seedRepository());
    const result = await service.execute({});
    expect(result.totalExpenses).toBe(300);
  });

  it("returns accounts summary", async () => {
    const service = new GetAccountsSummaryService(seedRepository());
    const result = await service.execute({});
    expect(result.totalAccounts).toBe(6);
    expect(result.activeAccounts).toBe(6);
    expect(result.accountsByType.find((row) => row.accountType === "ASSET")?.count).toBe(
      2,
    );
  });

  it("counts inactive accounts", async () => {
    const repository = seedRepository();
    repository.seed({
      accounts: [
        ...buildStandardAccounts().map((account, index) =>
          index === 0 ? { ...account, isActive: false } : account,
        ),
      ],
    });
    const service = new GetAccountsSummaryService(repository);
    const result = await service.execute();
    expect(result.inactiveAccounts).toBe(1);
    expect(result.activeAccounts).toBe(5);
  });
});
