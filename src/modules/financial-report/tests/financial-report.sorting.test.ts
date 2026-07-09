import { describe, expect, it } from "vitest";

import { GetJournalReportService } from "@/modules/financial-report/application/services/get-journal-report.service";
import { GetAccountLedgerService } from "@/modules/financial-report/application/services/get-account-ledger.service";

import {
  AR_ACCOUNT_ID,
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

describe("sorting tests", () => {
  it("sorts journals by journalDate ascending", async () => {
    const service = new GetJournalReportService(seed());
    const result = await service.execute({
      sortBy: "journalDate",
      sortOrder: "asc",
      status: "POSTED",
    });
    expect(result.items[0]!.journalNumber).toBe("JE-001");
    expect(result.items[1]!.journalNumber).toBe("JE-002");
  });

  it("sorts journals by journalDate descending", async () => {
    const service = new GetJournalReportService(seed());
    const result = await service.execute({
      sortBy: "journalDate",
      sortOrder: "desc",
      status: "POSTED",
    });
    expect(result.items[0]!.journalNumber).toBe("JE-002");
  });

  it("sorts journals by journalNumber", async () => {
    const service = new GetJournalReportService(seed());
    const result = await service.execute({
      sortBy: "journalNumber",
      sortOrder: "asc",
      status: "POSTED",
    });
    expect(result.items.map((item) => item.journalNumber)).toEqual([
      "JE-001",
      "JE-002",
    ]);
  });

  it("sorts account ledger by journalNumber descending", async () => {
    const repository = new InMemoryFinancialReportRepository();
    repository.seed({
      accounts: buildStandardAccounts(),
      journals: [
        buildPostedRevenueJournal(),
        buildPostedRevenueJournal({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9",
          journalNumber: "JE-009",
          journalDate: new Date("2026-01-16T00:00:00.000Z"),
        }),
      ],
    });

    const service = new GetAccountLedgerService(repository);
    const result = await service.execute({
      accountId: AR_ACCOUNT_ID,
      sortBy: "journalNumber",
      sortOrder: "desc",
    });

    expect(result.entries[0]!.journalNumber).toBe("JE-009");
  });

  it("defaults journal report sort order to asc via pagination schema", async () => {
    const service = new GetJournalReportService(seed());
    const result = await service.execute({ status: "POSTED" });
    expect(result.items[0]!.journalNumber).toBe("JE-001");
  });
});
