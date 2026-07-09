import type { AccountType } from "@/modules/accounting/domain/account.constants";
import type {
  JournalEntryStatus,
  JournalReferenceType,
} from "@/modules/accounting/domain/journal-entry.constants";

export const CASH_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
export const AR_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
export const REVENUE_ACCOUNT_ID = "33333333-3333-4333-8333-333333333333";
export const EXPENSE_ACCOUNT_ID = "44444444-4444-4444-8444-444444444444";
export const LIABILITY_ACCOUNT_ID = "55555555-5555-4555-8555-555555555555";
export const EQUITY_ACCOUNT_ID = "66666666-6666-4666-8666-666666666666";
export const JOURNAL_ONE_ID = "77777777-7777-4777-8777-777777777777";
export const JOURNAL_TWO_ID = "88888888-8888-4888-8888-888888888888";
export const PAYMENT_ONE_ID = "99999999-9999-4999-8999-999999999999";

export interface FixtureAccount {
  id: string;
  accountCode: string;
  name: string;
  accountType: AccountType;
  isActive: boolean;
}

export interface FixtureJournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  memo: string | null;
  sortOrder: number;
}

export interface FixtureJournal {
  id: string;
  journalNumber: string;
  journalDate: Date;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  status: JournalEntryStatus;
  lines: FixtureJournalLine[];
  createdAt: Date;
}

export interface FixturePayment {
  id: string;
  paymentDate: Date;
  amount: number;
  status: "PENDING" | "POSTED" | "VOID";
}

export function buildAccount(
  overrides: Partial<FixtureAccount> = {},
): FixtureAccount {
  return {
    id: CASH_ACCOUNT_ID,
    accountCode: "1000",
    name: "Cash",
    accountType: "ASSET",
    isActive: true,
    ...overrides,
  };
}

export function buildStandardAccounts(): FixtureAccount[] {
  return [
    buildAccount(),
    buildAccount({
      id: AR_ACCOUNT_ID,
      accountCode: "1100",
      name: "Accounts Receivable",
      accountType: "ASSET",
    }),
    buildAccount({
      id: REVENUE_ACCOUNT_ID,
      accountCode: "4000",
      name: "Rental Revenue",
      accountType: "INCOME",
    }),
    buildAccount({
      id: EXPENSE_ACCOUNT_ID,
      accountCode: "5000",
      name: "Operating Expense",
      accountType: "EXPENSE",
    }),
    buildAccount({
      id: LIABILITY_ACCOUNT_ID,
      accountCode: "2000",
      name: "Accounts Payable",
      accountType: "LIABILITY",
    }),
    buildAccount({
      id: EQUITY_ACCOUNT_ID,
      accountCode: "3000",
      name: "Owner Equity",
      accountType: "EQUITY",
    }),
  ];
}

export function buildPostedRevenueJournal(
  overrides: Partial<FixtureJournal> = {},
): FixtureJournal {
  return {
    id: JOURNAL_ONE_ID,
    journalNumber: "JE-001",
    journalDate: new Date("2026-01-15T00:00:00.000Z"),
    description: "Recognize rental revenue",
    referenceType: "RENTAL_INVOICE",
    referenceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    status: "POSTED",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    lines: [
      {
        id: "line-1",
        accountId: AR_ACCOUNT_ID,
        debit: 1000,
        credit: 0,
        memo: "AR",
        sortOrder: 0,
      },
      {
        id: "line-2",
        accountId: REVENUE_ACCOUNT_ID,
        debit: 0,
        credit: 1000,
        memo: "Revenue",
        sortOrder: 1,
      },
    ],
    ...overrides,
  };
}

export function buildPostedExpenseJournal(
  overrides: Partial<FixtureJournal> = {},
): FixtureJournal {
  return {
    id: JOURNAL_TWO_ID,
    journalNumber: "JE-002",
    journalDate: new Date("2026-01-20T00:00:00.000Z"),
    description: "Record operating expense",
    referenceType: "MANUAL",
    referenceId: null,
    status: "POSTED",
    createdAt: new Date("2026-01-20T10:00:00.000Z"),
    lines: [
      {
        id: "line-3",
        accountId: EXPENSE_ACCOUNT_ID,
        debit: 300,
        credit: 0,
        memo: "Expense",
        sortOrder: 0,
      },
      {
        id: "line-4",
        accountId: CASH_ACCOUNT_ID,
        debit: 0,
        credit: 300,
        memo: "Cash out",
        sortOrder: 1,
      },
    ],
    ...overrides,
  };
}

export function buildDraftJournal(
  overrides: Partial<FixtureJournal> = {},
): FixtureJournal {
  return {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    journalNumber: "JE-DRAFT",
    journalDate: new Date("2026-01-25T00:00:00.000Z"),
    description: "Draft should be ignored",
    referenceType: null,
    referenceId: null,
    status: "DRAFT",
    createdAt: new Date("2026-01-25T10:00:00.000Z"),
    lines: [
      {
        id: "line-d1",
        accountId: CASH_ACCOUNT_ID,
        debit: 50,
        credit: 0,
        memo: null,
        sortOrder: 0,
      },
      {
        id: "line-d2",
        accountId: REVENUE_ACCOUNT_ID,
        debit: 0,
        credit: 50,
        memo: null,
        sortOrder: 1,
      },
    ],
    ...overrides,
  };
}

export function buildPostedPayment(
  overrides: Partial<FixturePayment> = {},
): FixturePayment {
  return {
    id: PAYMENT_ONE_ID,
    paymentDate: new Date("2026-01-18T00:00:00.000Z"),
    amount: 500,
    status: "POSTED",
    ...overrides,
  };
}
