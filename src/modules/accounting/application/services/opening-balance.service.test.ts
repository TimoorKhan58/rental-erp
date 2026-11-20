import { describe, expect, it } from "vitest";

import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import { InMemoryAccountRepository } from "../../tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "../../tests/helpers/in-memory-journal-entry.repository";
import { MockAuditLogger } from "../../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../../tests/helpers/transaction-test-runner";
import { OpeningBalanceService } from "./opening-balance.service";

const ORG = "00000000-0000-4000-8000-0000000000c3";
const USER = "00000000-0000-4000-8000-0000000000c4";

function setup() {
  const accountRepository = new InMemoryAccountRepository();
  const journalEntryRepository = new InMemoryJournalEntryRepository();
  const runner = createPassThroughTransactionRunner({
    accountRepository,
    journalEntryRepository,
    auditLogger: new MockAuditLogger(),
    userId: USER,
  });
  const service = new OpeningBalanceService(runner, accountRepository, journalEntryRepository);
  const run = <T,>(op: () => Promise<T>) => runInOrganization(ORG, op);

  const balances = async () => {
    const entries = (await journalEntryRepository.findPaged({ page: 1, pageSize: 50 })).items.filter(
      (entry) => entry.status === "POSTED",
    );
    const result: Record<string, number> = {};
    for (const entry of entries) {
      for (const line of entry.lines) {
        const code = (await accountRepository.findById(line.accountId))?.accountCode ?? "?";
        result[code] = (result[code] ?? 0) + line.debit - line.credit;
      }
    }
    return result;
  };

  return { service, run, accountRepository, balances };
}

describe("opening balance (owner's capital)", () => {
  it("puts the owner's money and equipment in, balanced by Owner's Capital", async () => {
    const { service, run, accountRepository, balances } = setup();
    await run(() =>
      accountRepository.create({ accountCode: "1010", name: "Cash in hand", accountType: "ASSET", isActive: true }),
    );
    await run(() =>
      accountRepository.create({ accountCode: "1020", name: "Bank", accountType: "ASSET", isActive: true }),
    );

    const saved = await run(() =>
      service.record({ date: "2026-11-01", cashInHand: 50_000, bank: 700_000, equipment: 400_000 }),
    );

    expect(saved.total).toBe(1_150_000);
    expect(saved.journalNumber).toBe("JE-OPENING-BALANCE");
    expect(await run(balances)).toEqual({ "1010": 50_000, "1020": 700_000, "1500": 400_000, "3000": -1_150_000 });
    expect((await run(() => accountRepository.findByAccountCode("3000")))?.accountType).toBe("EQUITY");
  });

  it("replaces the old opening balance when saved again", async () => {
    const { service, run, balances } = setup();

    await run(() => service.record({ date: "2026-11-01", cashInHand: 1000 }));
    await run(() => service.record({ date: "2026-11-01", cashInHand: 2500, bank: 500 }));

    // No 1010/1020 here, so both go to 1000 Cash.
    expect(await run(balances)).toEqual({ "1000": 3000, "3000": -3000 });
    const current = await run(() => service.get());
    expect(current?.total).toBe(3000);
    expect(current?.journalNumber).toBe("JE-OPENING-BALANCE-2");
  });

  it("refuses an opening balance with no amounts", async () => {
    const { service, run } = setup();
    await expect(run(() => service.record({ date: "2026-11-01" }))).rejects.toThrow();
    expect(await run(() => service.get())).toBeNull();
  });
});
