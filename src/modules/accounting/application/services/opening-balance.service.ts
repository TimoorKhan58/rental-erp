import { z } from "zod";

import { DEFAULT_ACCOUNT_CODES } from "@/modules/accounting/domain/default-account-codes.constants";
import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import { JournalEntry } from "@/modules/accounting/domain";
import { parseRequest } from "@/shared/application/validation";
import { UnauthorizedError, UnprocessableError } from "@/shared/infrastructure/errors";
import { getOrganizationScope } from "@/shared/infrastructure/tenancy/organization-scope";

import { toUserId } from "../mappers/journal-entry.mapper";
import type { IAccountingTransactionRunner } from "./accounting-transaction.runner";
import { JOURNAL_ENTRY_ENTITY_NAME, JOURNAL_ENTRY_MODULE } from "./accounting-service.constants";
import { toJournalEntryAuditValues } from "./journal-entry-audit.mapper";
import {
  ensureStandardAccount,
  moneyAccountFor,
  readableOperationalJournalNumber,
} from "./operational-journal-posting.service";

/**
 * Opening balance (owner's decision, 2026-11-20): the money and equipment the
 * business already had when it started using RentCore, put in by the owner.
 * Without it cash and bank showed large minus figures, because every payment
 * out was recorded but the starting money never was.
 *
 *   Dr Cash in hand / Bank / Rental Equipment   Cr 3000 Owner's Capital
 *
 * There is one opening balance per business. Saving again voids the old entry
 * and posts the new one, so a mistake can be corrected.
 */
const MAX_AMOUNT = 999_999_999;
const money = z.coerce.number().min(0, "Enter zero or more").max(MAX_AMOUNT);

export const OpeningBalanceSchema = z
  .object({
    date: z.coerce.date(),
    cashInHand: money.default(0),
    bank: money.default(0),
    equipment: money.default(0),
  })
  .refine((value) => value.cashInHand + value.bank + value.equipment > 0, {
    message: "Enter at least one amount",
    path: ["cashInHand"],
  });

export type OpeningBalanceInput = z.input<typeof OpeningBalanceSchema>;

export type OpeningBalanceDto = {
  journalEntryId: string;
  journalNumber: string;
  date: string;
  lines: Array<{ accountCode: string; accountName: string; amount: number }>;
  total: number;
};

const DESCRIPTION = "Opening balance (owner's capital) OPENING-BALANCE";
const REFERENCE_TYPE = "OTHER" as const;

function businessReferenceId(): string {
  const scope = getOrganizationScope();
  if (scope?.kind !== "organization") {
    throw new UnauthorizedError({ message: "A business is required for the opening balance" });
  }
  return scope.organizationId;
}

async function findActiveOpeningBalances(journalEntryRepository: IJournalEntryRepository) {
  const result = await journalEntryRepository.findPaged({
    page: 1,
    pageSize: 20,
    referenceType: REFERENCE_TYPE,
    referenceId: businessReferenceId(),
  });
  return result.items.filter((entry) => entry.status !== "VOID");
}

async function toOpeningBalanceDto(
  accountRepository: IAccountRepository,
  entry: JournalEntry,
): Promise<OpeningBalanceDto> {
  const lines: OpeningBalanceDto["lines"] = [];
  for (const line of entry.lines) {
    if (line.debit <= 0) {
      continue;
    }
    const account = await accountRepository.findById(line.accountId);
    lines.push({
      accountCode: account?.accountCode ?? "",
      accountName: account?.name ?? "",
      amount: line.debit,
    });
  }
  return {
    journalEntryId: entry.id,
    journalNumber: entry.journalNumber,
    date: entry.journalDate.toISOString(),
    lines,
    total: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100,
  };
}

export class OpeningBalanceService {
  constructor(
    private readonly transactionRunner: IAccountingTransactionRunner,
    private readonly accountRepository: IAccountRepository,
    private readonly journalEntryRepository: IJournalEntryRepository,
  ) {}

  /** The current opening balance, or null when none was entered yet. */
  async get(): Promise<OpeningBalanceDto | null> {
    const [entry] = await findActiveOpeningBalances(this.journalEntryRepository);
    return entry === undefined ? null : toOpeningBalanceDto(this.accountRepository, entry);
  }

  /** Records (or replaces) the opening balance. */
  async record(input: OpeningBalanceInput): Promise<OpeningBalanceDto> {
    const data = parseRequest(OpeningBalanceSchema, input);

    return this.transactionRunner.run(
      async ({ accountRepository, journalEntryRepository, auditLogger, userId }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({ message: "User context is required for the opening balance" });
        }
        const actor = toUserId(userId);
        const deps = { accountRepository, journalEntryRepository, userId: actor };

        // Replace: void what was there before.
        for (const old of await findActiveOpeningBalances(journalEntryRepository)) {
          const voided = old.withVoided();
          await journalEntryRepository.updateStatus(old.id, {
            status: voided.status,
            voidedAt: voided.voidedAt,
          });
        }

        const debits = new Map<string, number>();
        const add = (accountId: string, amount: number) => {
          if (amount > 0) {
            debits.set(accountId, Math.round(((debits.get(accountId) ?? 0) + amount) * 100) / 100);
          }
        };
        add((await moneyAccountFor(deps, "CASH")).id, data.cashInHand);
        add((await moneyAccountFor(deps, "BANK_TRANSFER")).id, data.bank);
        if (data.equipment > 0) {
          add((await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.RENTAL_EQUIPMENT)).id, data.equipment);
        }
        const capital = await ensureStandardAccount(deps, DEFAULT_ACCOUNT_CODES.OWNERS_CAPITAL);
        const total = Math.round((data.cashInHand + data.bank + data.equipment) * 100) / 100;

        const lines = [
          ...[...debits.entries()].map(([accountId, amount]) => ({
            accountId: accountId as never,
            debit: amount,
            credit: 0,
            memo: "Opening balance",
          })),
          { accountId: capital.id, debit: 0, credit: total, memo: "Put in by the owner" },
        ].map((line, index) => ({ ...line, sortOrder: index }));

        const createData = {
          journalNumber: await readableOperationalJournalNumber(
            journalEntryRepository,
            DESCRIPTION,
            () => `JE-OPENING-${Date.now()}`,
          ),
          journalDate: data.date,
          description: "Opening balance (owner's capital)",
          referenceType: REFERENCE_TYPE,
          referenceId: businessReferenceId(),
          lines,
          createdById: actor,
        };

        try {
          JournalEntry.create(createData);
        } catch (error) {
          throw new UnprocessableError({
            message: error instanceof Error ? error.message : "The opening balance is not valid",
          });
        }

        const entry = await journalEntryRepository.create(createData);
        const posted = entry.withPosted(actor);
        const saved = await journalEntryRepository.updateStatus(entry.id, {
          status: posted.status,
          postedAt: posted.postedAt,
          postedById: posted.postedById,
        });

        await auditLogger.log({
          module: JOURNAL_ENTRY_MODULE,
          entityName: JOURNAL_ENTRY_ENTITY_NAME,
          recordId: saved.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toJournalEntryAuditValues(saved),
        });

        return toOpeningBalanceDto(accountRepository, saved);
      },
    );
  }
}
