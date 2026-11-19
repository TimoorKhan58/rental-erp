import { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import type { Account } from "@/modules/accounting/domain/account.entity";
import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import {
  DEFAULT_ACCOUNT_CODES,
  OPTIONAL_MONEY_ACCOUNT_CODES,
  STANDARD_ACCOUNTS,
} from "@/modules/accounting/domain/default-account-codes.constants";
import type { JournalReferenceType } from "@/modules/accounting/domain/journal-entry.constants";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type { AccountId, JournalEntryId, UserId } from "@/shared/domain/ids";
import { createAppLogger, type ILogger } from "@/shared/infrastructure/logging";
import { getOrganizationScope } from "@/shared/infrastructure/tenancy/organization-scope";

/**
 * Automatic double-entry posting for business events:
 *
 *   invoice issued        Dr Accounts Receivable   Cr Rental Revenue
 *   customer payment      Dr Cash/Bank             Cr Accounts Receivable
 *   expense paid          Dr General Expense       Cr Cash/Bank
 *   stock received (PO)   Dr Rental Equipment      Cr Accounts Payable
 *   supplier payment      Dr Accounts Payable      Cr Cash/Bank
 *   hire-in returned      Dr Hire-in Cost          Cr Accounts Payable
 *   hire-in paid          Dr Accounts Payable      Cr Cash/Bank
 *
 * Voiding a document voids its entries (so the books never keep money that
 * was cancelled). A missing standard account is created rather than the
 * entry being skipped: before this, MT Service's invoices were silently left
 * out of the books because Rental Revenue did not exist yet (2026-11-19 audit).
 */

export type OperationalJournalPostingDeps = {
  accountRepository: IAccountRepository;
  journalEntryRepository: IJournalEntryRepository;
  userId: UserId;
  /** Defaults to the application logger. */
  logger?: ILogger;
};

type StandardCode = (typeof DEFAULT_ACCOUNT_CODES)[keyof typeof DEFAULT_ACCOUNT_CODES];

/** The standard account, created (and the creation logged) when missing. */
export async function ensureStandardAccount(
  deps: Pick<OperationalJournalPostingDeps, "accountRepository" | "logger">,
  code: StandardCode,
): Promise<Account> {
  const existing = await deps.accountRepository.findByAccountCode(code);
  if (existing !== null) {
    return existing;
  }

  const standard = STANDARD_ACCOUNTS[code];
  const created = await deps.accountRepository.create({
    accountCode: code,
    name: standard.name,
    accountType: standard.accountType,
    description: standard.description,
    isActive: true,
  });
  const scope = getOrganizationScope();
  (deps.logger ?? createAppLogger()).info("Standard account created for posting", {
    event: "accounting.account_created",
    organizationId: scope?.kind === "organization" ? scope.organizationId : undefined,
    accountCode: code,
  });
  return created;
}

/**
 * Where money goes in or out: cash in hand (1010) for cash and bank (1020)
 * for other methods when the business has those accounts, else Cash (1000).
 */
export async function moneyAccountFor(
  deps: Pick<OperationalJournalPostingDeps, "accountRepository" | "logger">,
  paymentMethod?: string | null,
): Promise<Account> {
  const preferred =
    paymentMethod === undefined || paymentMethod === null || paymentMethod === "CASH"
      ? OPTIONAL_MONEY_ACCOUNT_CODES.CASH_IN_HAND
      : OPTIONAL_MONEY_ACCOUNT_CODES.BANK;
  const account = await deps.accountRepository.findByAccountCode(preferred);
  if (account !== null && account.isActive) {
    return account;
  }
  return ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.CASH);
}

async function findActiveOperationalJournals(
  journalEntryRepository: IJournalEntryRepository,
  referenceType: JournalReferenceType,
  referenceId: string,
) {
  const result = await journalEntryRepository.findPaged({
    page: 1,
    pageSize: 50,
    referenceType,
    referenceId,
  });

  return result.items.filter((entry) => entry.status !== "VOID");
}

function buildOperationalJournalNumber(
  referenceType: JournalReferenceType,
  referenceId: string,
): string {
  return `JE-${referenceType.slice(0, 3)}-${referenceId.slice(0, 8)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function createAndPostOperationalJournal(
  deps: OperationalJournalPostingDeps,
  input: {
    journalDate: Date;
    description: string;
    referenceType: JournalReferenceType;
    referenceId: string;
    /** One entry per document unless repeats are expected (partial receipts, instalments). */
    allowRepeat?: boolean;
    lines: Array<{
      accountId: AccountId;
      debit: number;
      credit: number;
      memo?: string;
    }>;
  },
): Promise<JournalEntry | null> {
  if (!input.allowRepeat) {
    const [existing] = await findActiveOperationalJournals(
      deps.journalEntryRepository,
      input.referenceType,
      input.referenceId,
    );
    if (existing !== undefined) {
      return existing;
    }
  }

  const createData = {
    journalNumber: buildOperationalJournalNumber(input.referenceType, input.referenceId),
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

/** Two-line entry: debit one account, credit another, for the same amount. */
async function postPair(
  deps: OperationalJournalPostingDeps,
  input: {
    amount: number;
    date: Date;
    description: string;
    referenceType: JournalReferenceType;
    referenceId: string;
    allowRepeat?: boolean;
    debit: { account: Account; memo: string };
    credit: { account: Account; memo: string };
  },
): Promise<JournalEntry | null> {
  if (!(input.amount > 0)) {
    return null;
  }
  return createAndPostOperationalJournal(deps, {
    journalDate: input.date,
    description: input.description,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    allowRepeat: input.allowRepeat,
    lines: [
      { accountId: input.debit.account.id, debit: input.amount, credit: 0, memo: input.debit.memo },
      { accountId: input.credit.account.id, debit: 0, credit: input.amount, memo: input.credit.memo },
    ],
  });
}

/** Voids every active entry of a document (used when the document is voided). */
export async function voidOperationalJournals(
  journalEntryRepository: IJournalEntryRepository,
  referenceType: JournalReferenceType,
  referenceId: string,
): Promise<number> {
  const entries = await findActiveOperationalJournals(journalEntryRepository, referenceType, referenceId);
  for (const entry of entries) {
    const voided = entry.withVoided();
    await journalEntryRepository.updateStatus(entry.id, {
      status: voided.status,
      voidedAt: voided.voidedAt,
    });
  }
  return entries.length;
}

export async function postRentalInvoiceIssuedJournal(
  deps: OperationalJournalPostingDeps,
  input: { invoiceId: string; invoiceNumber: string; invoiceDate: Date; amount: number },
): Promise<JournalEntry | null> {
  return postPair(deps, {
    amount: input.amount,
    date: input.invoiceDate,
    description: `Invoice issued ${input.invoiceNumber}`,
    referenceType: "RENTAL_INVOICE",
    referenceId: input.invoiceId,
    debit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE), memo: "Accounts receivable" },
    credit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.RENTAL_REVENUE), memo: "Rental revenue" },
  });
}

export async function postPaymentReceivedJournal(
  deps: OperationalJournalPostingDeps,
  input: {
    paymentId: string;
    paymentNumber: string;
    paymentDate: Date;
    amount: number;
    paymentMethod?: string | null;
  },
): Promise<JournalEntry | null> {
  return postPair(deps, {
    amount: input.amount,
    date: input.paymentDate,
    description: `Payment received ${input.paymentNumber}`,
    referenceType: "PAYMENT",
    referenceId: input.paymentId,
    debit: { account: await moneyAccountFor(deps, input.paymentMethod), memo: "Money received" },
    credit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE), memo: "Accounts receivable" },
  });
}

export async function postExpensePaidJournal(
  deps: OperationalJournalPostingDeps,
  input: {
    expenseId: string;
    expenseNumber: string;
    expenseDate: Date;
    amount: number;
    paymentMethod?: string | null;
  },
): Promise<JournalEntry | null> {
  return postPair(deps, {
    amount: input.amount,
    date: input.expenseDate,
    description: `Expense paid ${input.expenseNumber}`,
    referenceType: "OTHER",
    referenceId: input.expenseId,
    debit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.GENERAL_EXPENSE), memo: "Expense" },
    credit: { account: await moneyAccountFor(deps, input.paymentMethod), memo: "Money paid" },
  });
}

/** Stock received on a purchase order: one entry per delivery. */
export async function postPurchaseReceivedJournal(
  deps: OperationalJournalPostingDeps,
  input: { purchaseOrderId: string; poNumber: string; receivedDate: Date; amount: number },
): Promise<JournalEntry | null> {
  return postPair(deps, {
    amount: input.amount,
    date: input.receivedDate,
    description: `Stock received ${input.poNumber}`,
    referenceType: "PURCHASE_ORDER",
    referenceId: input.purchaseOrderId,
    allowRepeat: true,
    debit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.RENTAL_EQUIPMENT), memo: "Rental equipment" },
    credit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE), memo: "Owed to supplier" },
  });
}

export async function postSupplierPaymentJournal(
  deps: OperationalJournalPostingDeps,
  input: {
    supplierPaymentId: string;
    paymentNumber: string;
    paymentDate: Date;
    amount: number;
    paymentMethod?: string | null;
  },
): Promise<JournalEntry | null> {
  return postPair(deps, {
    amount: input.amount,
    date: input.paymentDate,
    description: `Supplier paid ${input.paymentNumber}`,
    referenceType: "SUPPLIER_PAYMENT",
    referenceId: input.supplierPaymentId,
    debit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE), memo: "Owed to supplier" },
    credit: { account: await moneyAccountFor(deps, input.paymentMethod), memo: "Money paid" },
  });
}

/** Hire-in cost, recognised once when the hired items go back to the supplier. */
export async function postHireInCostJournal(
  deps: OperationalJournalPostingDeps,
  input: { agreementId: string; agreementNumber: string; date: Date; amount: number },
): Promise<JournalEntry | null> {
  return postPair(deps, {
    amount: input.amount,
    date: input.date,
    description: `Hire-in cost ${input.agreementNumber}`,
    referenceType: "EXTERNAL_RENTAL",
    referenceId: input.agreementId,
    debit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.HIRE_IN_COST), memo: "Hire-in cost" },
    credit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE), memo: "Owed to supplier" },
  });
}

/** A payment to the supplier of a hire-in (instalments allowed). */
export async function postHireInPaymentJournal(
  deps: OperationalJournalPostingDeps,
  input: { agreementId: string; agreementNumber: string; date: Date; amount: number; paymentMethod?: string | null },
): Promise<JournalEntry | null> {
  return postPair(deps, {
    amount: input.amount,
    date: input.date,
    description: `Hire-in paid ${input.agreementNumber}`,
    referenceType: "SUPPLIER_PAYMENT",
    referenceId: input.agreementId,
    allowRepeat: true,
    debit: { account: await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE), memo: "Owed to supplier" },
    credit: { account: await moneyAccountFor(deps, input.paymentMethod), memo: "Money paid" },
  });
}

export type { JournalEntryId };
