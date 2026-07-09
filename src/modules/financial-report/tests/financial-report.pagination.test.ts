import { describe, expect, it } from "vitest";

import { GetAccountLedgerService } from "@/modules/financial-report/application/services/get-account-ledger.service";
import { GetJournalReportService } from "@/modules/financial-report/application/services/get-journal-report.service";

import {
  AR_ACCOUNT_ID,
  buildPostedRevenueJournal,
  buildStandardAccounts,
} from "./helpers/financial-report.fixtures";
import { InMemoryFinancialReportRepository } from "./helpers/in-memory-financial-report.repository";

function seedManyJournals() {
  const repository = new InMemoryFinancialReportRepository();
  const journals = Array.from({ length: 5 }, (_, index) =>
    buildPostedRevenueJournal({
      id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,
      journalNumber: `JE-00${index + 1}`,
      journalDate: new Date(`2026-01-${10 + index}T00:00:00.000Z`),
    }),
  );
  repository.seed({
    accounts: buildStandardAccounts(),
    journals,
  });
  return repository;
}

describe("pagination tests", () => {
  it("returns first page of journal report", async () => {
    const service = new GetJournalReportService(seedManyJournals());
    const result = await service.execute({
      page: 1,
      pageSize: 2,
      sortBy: "journalDate",
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(3);
    expect(result.items[0]!.journalNumber).toBe("JE-001");
  });

  it("returns middle page of journal report", async () => {
    const service = new GetJournalReportService(seedManyJournals());
    const result = await service.execute({
      page: 2,
      pageSize: 2,
      sortBy: "journalDate",
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.journalNumber).toBe("JE-003");
  });

  it("returns final partial page", async () => {
    const service = new GetJournalReportService(seedManyJournals());
    const result = await service.execute({
      page: 3,
      pageSize: 2,
      sortBy: "journalDate",
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.journalNumber).toBe("JE-005");
  });

  it("returns empty page beyond range", async () => {
    const service = new GetJournalReportService(seedManyJournals());
    const result = await service.execute({
      page: 10,
      pageSize: 2,
    });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(5);
  });

  it("paginates account ledger entries", async () => {
    const service = new GetAccountLedgerService(seedManyJournals());
    const page1 = await service.execute({
      accountId: AR_ACCOUNT_ID,
      page: 1,
      pageSize: 3,
      sortBy: "journalDate",
      sortOrder: "asc",
    });
    const page2 = await service.execute({
      accountId: AR_ACCOUNT_ID,
      page: 2,
      pageSize: 3,
      sortBy: "journalDate",
      sortOrder: "asc",
    });

    expect(page1.entries).toHaveLength(3);
    expect(page2.entries).toHaveLength(2);
    expect(page1.totalPages).toBe(2);
  });

  it("keeps running balance continuous across pages conceptually", async () => {
    const service = new GetAccountLedgerService(seedManyJournals());
    const full = await service.execute({
      accountId: AR_ACCOUNT_ID,
      page: 1,
      pageSize: 100,
      sortBy: "journalDate",
      sortOrder: "asc",
    });
    const page2 = await service.execute({
      accountId: AR_ACCOUNT_ID,
      page: 2,
      pageSize: 2,
      sortBy: "journalDate",
      sortOrder: "asc",
    });

    expect(page2.entries[0]!.runningBalance).toBe(full.entries[2]!.runningBalance);
  });
});
