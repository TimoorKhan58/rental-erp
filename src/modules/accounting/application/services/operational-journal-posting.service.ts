import { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import { DEFAULT_ACCOUNT_CODES } from "@/modules/accounting/domain/default-account-codes.constants";
import type { JournalReferenceType } from "@/modules/accounting/domain/journal-entry.constants";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type { AccountId, JournalEntryId, UserId } from "@/shared/domain/ids";
import { createAppLogger, type ILogger } from "@/shared/infrastructure/logging";
import { getOrganizationScope } from "@/shared/infrastructure/tenancy/organization-scope";

export type OperationalJournalPostingDeps = {
  accountRepository: IAccountRepository;
  journalEntryRepository: IJournalEntryRepository;
  userId: UserId;
  /** Defaults to the application logger. */
  logger?: ILogger;
};

/**
 * Posting needs the business's default accounts. When one is missing or
 * inactive the business document still goes through, but the gap is
 * reported (SaaS phase 3a) instead of being skipped silently, so the books
 * can be repaired — e.g. with scripts/provision-business.ts.
 */
function reportSkippedPosting(
  deps: OperationalJournalPostingDeps,
  referenceType: JournalReferenceType,
  referenceId: string,
  missingAccountCodes: string[],
): null {
  const scope = getOrganizationScope();
  (deps.logger ?? createAppLogger()).warn("Accounting posting skipped: default accounts missing", {
    event: "accounting.posting_skipped",
    organizationId: scope?.kind === "organization" ? scope.organizationId : undefined,
    referenceType,
    referenceId,
    missingAccountCodes,
  });
  return null;
}

function missingCodes(accounts: Record<string, unknown | null>): string[] {
  return Object.entries(accounts)
    .filter(([, account]) => account === null)
    .map(([code]) => code);
}

async function resolveAccount(
  accountRepository: IAccountRepository,
  accountCode: string,
) {
  const account = await accountRepository.findByAccountCode(accountCode);

  if (account === null || !account.isActive) {
    return null;
  }

  return account;
}

async function findExistingOperationalJournal(
  journalEntryRepository: IJournalEntryRepository,
  referenceType: JournalReferenceType,
  referenceId: string,
) {
  const result = await journalEntryRepository.findPaged({
    page: 1,
    pageSize: 5,
    referenceType,
    referenceId,
  });

  return result.items.find((entry) => entry.status !== "VOID") ?? null;
}

function buildOperationalJournalNumber(
  referenceType: JournalReferenceType,
  referenceId: string,
): string {
  return `JE-${referenceType.slice(0, 3)}-${referenceId.slice(0, 8)}-${Date.now()}`;
}

async function createAndPostOperationalJournal(
  deps: OperationalJournalPostingDeps,
  input: {
    journalDate: Date;
    description: string;
    referenceType: JournalReferenceType;
    referenceId: string;
    lines: Array<{
      accountId: AccountId;
      debit: number;
      credit: number;
      memo?: string;
    }>;
  },
): Promise<JournalEntry | null> {
  const existing = await findExistingOperationalJournal(
    deps.journalEntryRepository,
    input.referenceType,
    input.referenceId,
  );

  if (existing !== null) {
    return existing;
  }

  const createData = {
    journalNumber: buildOperationalJournalNumber(
      input.referenceType,
      input.referenceId,
    ),
    journalDate: input.journalDate,
    description: input.description,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    lines: input.lines.map((line, index) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo ?? null,
      sortOrder: index,
    })),
    createdById: deps.userId,
  };

  JournalEntry.create(createData);

  const entry = await deps.journalEntryRepository.create(createData);
  const posted = entry.withPosted(deps.userId);

  return deps.journalEntryRepository.updateStatus(entry.id, {
    status: posted.status,
    postedAt: posted.postedAt,
    postedById: posted.postedById,
  });
}

export async function postRentalInvoiceIssuedJournal(
  deps: OperationalJournalPostingDeps,
  input: {
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    amount: number;
  },
): Promise<JournalEntry | null> {
  if (input.amount <= 0) {
    return null;
  }

  const accountsReceivable = await resolveAccount(
    deps.accountRepository,
    DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
  );
  const rentalRevenue = await resolveAccount(
    deps.accountRepository,
    DEFAULT_ACCOUNT_CODES.RENTAL_REVENUE,
  );

  if (accountsReceivable === null || rentalRevenue === null) {
    return reportSkippedPosting(
      deps,
      "RENTAL_INVOICE",
      input.invoiceId,
      missingCodes({
        [DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE]: accountsReceivable,
        [DEFAULT_ACCOUNT_CODES.RENTAL_REVENUE]: rentalRevenue,
      }),
    );
  }

  return createAndPostOperationalJournal(deps, {
    journalDate: input.invoiceDate,
    description: `Invoice issued ${input.invoiceNumber}`,
    referenceType: "RENTAL_INVOICE",
    referenceId: input.invoiceId,
    lines: [
      {
        accountId: accountsReceivable.id,
        debit: input.amount,
        credit: 0,
        memo: "Accounts receivable",
      },
      {
        accountId: rentalRevenue.id,
        debit: 0,
        credit: input.amount,
        memo: "Rental revenue",
      },
    ],
  });
}

export async function postPaymentReceivedJournal(
  deps: OperationalJournalPostingDeps,
  input: {
    paymentId: string;
    paymentNumber: string;
    paymentDate: Date;
    amount: number;
  },
): Promise<JournalEntry | null> {
  if (input.amount <= 0) {
    return null;
  }

  const cash = await resolveAccount(deps.accountRepository, DEFAULT_ACCOUNT_CODES.CASH);
  const accountsReceivable = await resolveAccount(
    deps.accountRepository,
    DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
  );

  if (cash === null || accountsReceivable === null) {
    return reportSkippedPosting(
      deps,
      "PAYMENT",
      input.paymentId,
      missingCodes({
        [DEFAULT_ACCOUNT_CODES.CASH]: cash,
        [DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE]: accountsReceivable,
      }),
    );
  }

  return createAndPostOperationalJournal(deps, {
    journalDate: input.paymentDate,
    description: `Payment received ${input.paymentNumber}`,
    referenceType: "PAYMENT",
    referenceId: input.paymentId,
    lines: [
      {
        accountId: cash.id,
        debit: input.amount,
        credit: 0,
        memo: "Cash received",
      },
      {
        accountId: accountsReceivable.id,
        debit: 0,
        credit: input.amount,
        memo: "Accounts receivable",
      },
    ],
  });
}

export async function postExpensePaidJournal(
  deps: OperationalJournalPostingDeps,
  input: {
    expenseId: string;
    expenseNumber: string;
    expenseDate: Date;
    amount: number;
  },
): Promise<JournalEntry | null> {
  if (input.amount <= 0) {
    return null;
  }

  const expenseAccount = await resolveAccount(
    deps.accountRepository,
    DEFAULT_ACCOUNT_CODES.GENERAL_EXPENSE,
  );
  const cash = await resolveAccount(deps.accountRepository, DEFAULT_ACCOUNT_CODES.CASH);

  if (expenseAccount === null || cash === null) {
    return reportSkippedPosting(
      deps,
      "OTHER",
      input.expenseId,
      missingCodes({
        [DEFAULT_ACCOUNT_CODES.GENERAL_EXPENSE]: expenseAccount,
        [DEFAULT_ACCOUNT_CODES.CASH]: cash,
      }),
    );
  }

  return createAndPostOperationalJournal(deps, {
    journalDate: input.expenseDate,
    description: `Expense paid ${input.expenseNumber}`,
    referenceType: "OTHER",
    referenceId: input.expenseId,
    lines: [
      {
        accountId: expenseAccount.id,
        debit: input.amount,
        credit: 0,
        memo: "Expense",
      },
      {
        accountId: cash.id,
        debit: 0,
        credit: input.amount,
        memo: "Cash paid",
      },
    ],
  });
}

export type { JournalEntryId };
