import { describe, expect, it } from "vitest";

import type { UserId } from "@/shared/domain/ids";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import { InMemoryAccountRepository } from "../../tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "../../tests/helpers/in-memory-journal-entry.repository";
import {
  postExpensePaidJournal,
  postHireInCostJournal,
  postHireInPaymentJournal,
  postPaymentReceivedJournal,
  postPurchaseReceivedJournal,
  postRentalInvoiceIssuedJournal,
  postSupplierPaymentJournal,
  readableOperationalJournalNumber,
  voidOperationalJournals,
} from "./operational-journal-posting.service";

const ORG = "00000000-0000-4000-8000-0000000000b2";
const day = new Date("2026-11-19T00:00:00.000Z");

function setup(existingCodes: Array<[string, string]> = []) {
  const accountRepository = new InMemoryAccountRepository();
  const journalEntryRepository = new InMemoryJournalEntryRepository();
  const deps = { accountRepository, journalEntryRepository, userId: "u1" as UserId };
  const run = <T,>(op: () => Promise<T>) => runInOrganization(ORG, op);
  const createAccounts = () =>
    run(async () => {
      for (const [accountCode, name] of existingCodes) {
        await accountRepository.create({ accountCode, name, accountType: "ASSET", isActive: true });
      }
    });

  /** Posted balance (debit − credit) per account code. */
  const balances = async () => {
    const entries = (await journalEntryRepository.findPaged({ page: 1, pageSize: 100 })).items.filter(
      (entry) => entry.status === "POSTED",
    );
    const result: Record<string, number> = {};
    for (const entry of entries) {
      for (const line of entry.lines) {
        const account = await accountRepository.findById(line.accountId);
        const code = account?.accountCode ?? "?";
        result[code] = (result[code] ?? 0) + line.debit - line.credit;
      }
    }
    return result;
  };

  return { deps, run, createAccounts, balances, accountRepository, journalEntryRepository };
}

describe("automatic accounting (2026-11-19 audit)", () => {
  it("numbers entries after their document: JE-INV-1, then JE-INV-1-2", async () => {
    const { deps, run, journalEntryRepository } = setup();
    await run(() =>
      postHireInPaymentJournal(deps, { agreementId: "era-1", agreementNumber: "ERA-00012", date: day, amount: 100 }),
    );
    await run(() =>
      postHireInPaymentJournal(deps, { agreementId: "era-1", agreementNumber: "ERA-00012", date: day, amount: 50 }),
    );

    const numbers = (await run(() => journalEntryRepository.findPaged({ page: 1, pageSize: 10 }))).items
      .map((entry) => entry.journalNumber)
      .sort();
    expect(numbers).toEqual(["JE-ERA-00012", "JE-ERA-00012-2"]);
    await expect(
      readableOperationalJournalNumber(journalEntryRepository, "no number here", () => "fallback"),
    ).resolves.toBe("fallback");
  });

  it("creates a missing standard account instead of skipping the entry", async () => {
    const { deps, run, balances, accountRepository } = setup();

    await run(() =>
      postRentalInvoiceIssuedJournal(deps, { invoiceId: "inv-1", invoiceNumber: "INV-1", invoiceDate: day, amount: 500 }),
    );

    expect(await balances()).toEqual({ "1100": 500, "4000": -500 });
    expect((await accountRepository.findByAccountCode("4000"))?.name).toBe("Rental Revenue");
  });

  it("posts each document once", async () => {
    const { deps, run, balances } = setup();
    const post = () =>
      postRentalInvoiceIssuedJournal(deps, { invoiceId: "inv-1", invoiceNumber: "INV-1", invoiceDate: day, amount: 500 });
    await run(post);
    await run(post);
    expect(await balances()).toEqual({ "1100": 500, "4000": -500 });
  });

  it("puts cash in cash-in-hand and other methods in the bank when those accounts exist", async () => {
    const { deps, run, balances, createAccounts } = setup([
      ["1010", "Cash in hand"],
      ["1020", "Bank account"],
    ]);
    await createAccounts();

    await run(() => postPaymentReceivedJournal(deps, { paymentId: "p1", paymentNumber: "PAY-1", paymentDate: day, amount: 300, paymentMethod: "CASH" }));
    await run(() => postPaymentReceivedJournal(deps, { paymentId: "p2", paymentNumber: "PAY-2", paymentDate: day, amount: 200, paymentMethod: "BANK_TRANSFER" }));

    expect(await balances()).toEqual({ "1010": 300, "1020": 200, "1100": -500 });
  });

  it("uses Cash (1000) when there are no cash-in-hand / bank accounts", async () => {
    const { deps, run, balances } = setup();
    await run(() => postExpensePaidJournal(deps, { expenseId: "e1", expenseNumber: "EXP-1", expenseDate: day, amount: 150, paymentMethod: "BANK_TRANSFER" }));
    expect(await balances()).toEqual({ "1000": -150, "5000": 150 });
  });

  it("voiding a payment takes it out of the books", async () => {
    const { deps, run, balances, journalEntryRepository } = setup();
    await run(() => postRentalInvoiceIssuedJournal(deps, { invoiceId: "inv-1", invoiceNumber: "INV-1", invoiceDate: day, amount: 500 }));
    await run(() => postPaymentReceivedJournal(deps, { paymentId: "p1", paymentNumber: "PAY-1", paymentDate: day, amount: 500 }));

    expect(await run(() => voidOperationalJournals(journalEntryRepository, "PAYMENT", "p1"))).toBe(1);
    expect(await balances()).toEqual({ "1100": 500, "4000": -500 });
  });

  it("records purchases as equipment owed to the supplier, then the payment", async () => {
    const { deps, run, balances } = setup();
    // Two deliveries on one purchase order both count.
    await run(() => postPurchaseReceivedJournal(deps, { purchaseOrderId: "po1", poNumber: "PO-1", receivedDate: day, amount: 350000 }));
    await run(() => postPurchaseReceivedJournal(deps, { purchaseOrderId: "po1", poNumber: "PO-1", receivedDate: day, amount: 50000 }));
    await run(() => postSupplierPaymentJournal(deps, { supplierPaymentId: "sp1", paymentNumber: "SP-1", paymentDate: day, amount: 300000, paymentMethod: "CASH" }));

    expect(await balances()).toEqual({ "1500": 400000, "2000": -100000, "1000": -300000 });
  });

  it("records a hire-in as a cost owed to the supplier, paid in instalments", async () => {
    const { deps, run, balances } = setup();
    await run(() => postHireInCostJournal(deps, { agreementId: "er1", agreementNumber: "ERA-1", date: day, amount: 30000 }));
    await run(() => postHireInCostJournal(deps, { agreementId: "er1", agreementNumber: "ERA-1", date: day, amount: 30000 }));
    await run(() => postHireInPaymentJournal(deps, { agreementId: "er1", agreementNumber: "ERA-1", date: day, amount: 10000 }));
    await run(() => postHireInPaymentJournal(deps, { agreementId: "er1", agreementNumber: "ERA-1", date: day, amount: 20000 }));

    expect(await balances()).toEqual({ "5200": 30000, "2000": 0, "1000": -30000 });
  });

  it("does not post zero amounts", async () => {
    const { deps, run, balances } = setup();
    expect(await run(() => postExpensePaidJournal(deps, { expenseId: "e0", expenseNumber: "EXP-0", expenseDate: day, amount: 0 }))).toBeNull();
    expect(await balances()).toEqual({});
  });
});
