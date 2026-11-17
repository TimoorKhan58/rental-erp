import { describe, expect, it, vi } from "vitest";

import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type { UserId } from "@/shared/domain/ids";
import type { ILogger } from "@/shared/infrastructure/logging";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import {
  postExpensePaidJournal,
  postPaymentReceivedJournal,
  postRentalInvoiceIssuedJournal,
} from "./operational-journal-posting.service";

const ORG = "00000000-0000-4000-8000-0000000000b2";

function depsWithAccounts(codes: string[]) {
  const accountRepository = {
    findByAccountCode: vi.fn(async (code: string) =>
      codes.includes(code) ? { id: `acc-${code}`, isActive: true } : null,
    ),
  } as unknown as IAccountRepository;
  const journalEntryRepository = {
    findPaged: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  } as unknown as IJournalEntryRepository;
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as ILogger;
  return {
    deps: { accountRepository, journalEntryRepository, userId: "u1" as UserId, logger },
    journalEntryRepository,
    logger,
  };
}

describe("operational journal posting with missing default accounts (SaaS phase 3a)", () => {
  it("reports a skipped invoice posting with the business and missing codes", async () => {
    const { deps, journalEntryRepository, logger } = depsWithAccounts(["1100"]);

    const result = await runInOrganization(ORG, () =>
      postRentalInvoiceIssuedJournal(deps, {
        invoiceId: "inv-1",
        invoiceNumber: "INV-00001",
        invoiceDate: new Date("2030-01-12"),
        amount: 500,
      }),
    );

    expect(result).toBeNull();
    expect(journalEntryRepository.create).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      "Accounting posting skipped: default accounts missing",
      expect.objectContaining({
        event: "accounting.posting_skipped",
        organizationId: ORG,
        referenceType: "RENTAL_INVOICE",
        referenceId: "inv-1",
        missingAccountCodes: ["4000"],
      }),
    );
  });

  it("reports skipped payment and expense postings", async () => {
    const { deps, logger } = depsWithAccounts([]);

    await postPaymentReceivedJournal(deps, {
      paymentId: "pay-1",
      paymentNumber: "PAY-00001",
      paymentDate: new Date("2030-01-12"),
      amount: 500,
    });
    await postExpensePaidJournal(deps, {
      expenseId: "exp-1",
      expenseNumber: "EXP-00001",
      expenseDate: new Date("2030-01-12"),
      amount: 50,
    });

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(vi.mocked(logger.warn).mock.calls[0]?.[1]).toMatchObject({
      referenceType: "PAYMENT",
      missingAccountCodes: ["1000", "1100"],
    });
    expect(vi.mocked(logger.warn).mock.calls[1]?.[1]).toMatchObject({
      referenceType: "OTHER",
      missingAccountCodes: ["1000", "5000"],
    });
  });

  it("does not report anything for a zero amount", async () => {
    const { deps, logger } = depsWithAccounts([]);
    await postPaymentReceivedJournal(deps, {
      paymentId: "pay-0",
      paymentNumber: "PAY-0",
      paymentDate: new Date(),
      amount: 0,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
