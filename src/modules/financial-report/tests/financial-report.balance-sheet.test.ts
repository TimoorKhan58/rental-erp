import { describe, expect, it } from "vitest";

import { GetBalanceSheetService } from "@/modules/financial-report/application/services/get-balance-sheet.service";

import {
  buildAccount,
  buildPostedExpenseJournal,
  buildPostedRevenueJournal,
  buildStandardAccounts,
  EQUITY_ACCOUNT_ID,
  LIABILITY_ACCOUNT_ID,
} from "./helpers/financial-report.fixtures";
import { InMemoryFinancialReportRepository } from "./helpers/in-memory-financial-report.repository";

describe("balance sheet equation tests", () => {
  it("assets equal liabilities plus equity with net income", async () => {
    const repository = new InMemoryFinancialReportRepository();
    repository.seed({
      accounts: buildStandardAccounts(),
      journals: [buildPostedRevenueJournal(), buildPostedExpenseJournal()],
    });

    const result = await new GetBalanceSheetService(repository).execute({});
    expect(result.isBalanced).toBe(true);
    expect(result.totalAssets).toBe(
      result.totalLiabilities + result.totalEquity,
    );
  });

  it("includes liability balances", async () => {
    const repository = new InMemoryFinancialReportRepository();
    repository.seed({
      accounts: buildStandardAccounts(),
      journals: [
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          journalNumber: "JE-L1",
          journalDate: new Date("2026-01-10T00:00:00.000Z"),
          description: "Record liability",
          referenceType: "MANUAL",
          referenceId: null,
          status: "POSTED",
          createdAt: new Date("2026-01-10T10:00:00.000Z"),
          lines: [
            {
              id: "l1",
              accountId: buildStandardAccounts()[0]!.id,
              debit: 200,
              credit: 0,
              memo: null,
              sortOrder: 0,
            },
            {
              id: "l2",
              accountId: LIABILITY_ACCOUNT_ID,
              debit: 0,
              credit: 200,
              memo: null,
              sortOrder: 1,
            },
          ],
        },
      ],
    });

    const result = await new GetBalanceSheetService(repository).execute({});
    expect(result.totalLiabilities).toBe(200);
    expect(result.isBalanced).toBe(true);
  });

  it("includes equity account balances", async () => {
    const repository = new InMemoryFinancialReportRepository();
    repository.seed({
      accounts: buildStandardAccounts(),
      journals: [
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          journalNumber: "JE-E1",
          journalDate: new Date("2026-01-10T00:00:00.000Z"),
          description: "Owner contribution",
          referenceType: "MANUAL",
          referenceId: null,
          status: "POSTED",
          createdAt: new Date("2026-01-10T10:00:00.000Z"),
          lines: [
            {
              id: "e1",
              accountId: buildAccount().id,
              debit: 500,
              credit: 0,
              memo: null,
              sortOrder: 0,
            },
            {
              id: "e2",
              accountId: EQUITY_ACCOUNT_ID,
              debit: 0,
              credit: 500,
              memo: null,
              sortOrder: 1,
            },
          ],
        },
      ],
    });

    const result = await new GetBalanceSheetService(repository).execute({});
    expect(result.equity.accounts.some((row) => row.accountCode === "3000")).toBe(
      true,
    );
    expect(result.isBalanced).toBe(true);
  });

  it("omits zero-balance asset accounts from section lines", async () => {
    const repository = new InMemoryFinancialReportRepository();
    repository.seed({
      accounts: buildStandardAccounts(),
      journals: [],
    });

    const result = await new GetBalanceSheetService(repository).execute({});
    expect(result.assets.accounts).toHaveLength(0);
    expect(result.totalAssets).toBe(0);
    expect(result.isBalanced).toBe(true);
  });

  it("adds net income line under equity when non-zero", async () => {
    const repository = new InMemoryFinancialReportRepository();
    repository.seed({
      accounts: buildStandardAccounts(),
      journals: [buildPostedRevenueJournal()],
    });

    const result = await new GetBalanceSheetService(repository).execute({});
    expect(
      result.equity.accounts.some((row) => row.accountCode === "NI"),
    ).toBe(true);
    expect(result.netIncome).toBe(1000);
  });
});
