import {
  JournalEntry,
  JournalEntryInvariantError,
} from "@/modules/accounting/domain";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { JournalEntryDto } from "../dtos/journal-entry.dto";
import {
  toCreateJournalEntryData,
  toJournalEntryDto,
  toUserId,
} from "../mappers/journal-entry.mapper";
import {
  CreateJournalEntrySchema,
  type CreateJournalEntryInput,
} from "../schemas/journal-entry.schemas";
import {
  JOURNAL_ENTRY_ENTITY_NAME,
  JOURNAL_ENTRY_MODULE,
} from "./accounting-service.constants";
import type { IAccountingTransactionRunner } from "./accounting-transaction.runner";
import { toJournalEntryAuditValues } from "./journal-entry-audit.mapper";
import { validateAccountsForJournalLines } from "./journal-entry-account.validation";

/** "JE-20261120-1", "JE-20261120-2"… for entries typed in by hand. */
async function nextManualJournalNumber(
  journalEntryRepository: Pick<IJournalEntryRepository, "findByJournalNumber">,
  journalDate: Date | string,
): Promise<string> {
  const day = new Date(journalDate).toISOString().slice(0, 10).replaceAll("-", "");
  for (let n = 1; n <= 500; n += 1) {
    const candidate = `JE-${day}-${n}`;
    if ((await journalEntryRepository.findByJournalNumber(candidate)) === null) {
      return candidate;
    }
  }
  return `JE-${day}-${Date.now()}`;
}

export class CreateJournalEntryService {
  constructor(
    private readonly transactionRunner: IAccountingTransactionRunner,
  ) {}

  async execute(input: CreateJournalEntryInput): Promise<JournalEntryDto> {
    const data = parseRequest(CreateJournalEntrySchema, input);

    return this.transactionRunner.run(
      async ({ accountRepository, journalEntryRepository, auditLogger, userId }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create journal entry",
          });
        }

        const journalNumber =
          data.journalNumber && data.journalNumber.trim() !== ""
            ? data.journalNumber
            : await nextManualJournalNumber(journalEntryRepository, data.journalDate);
        const createData = toCreateJournalEntryData({ ...data, journalNumber }, toUserId(userId));

        try {
          JournalEntry.create(createData);
        } catch (error) {
          if (error instanceof JournalEntryInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        await validateAccountsForJournalLines(
          accountRepository,
          createData.lines.map((line) => line.accountId),
        );

        const existing = await journalEntryRepository.findByJournalNumber(
          createData.journalNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Journal number already exists",
            details: { journalNumber: createData.journalNumber },
          });
        }

        const entry = await journalEntryRepository.create(createData);

        await auditLogger.log({
          module: JOURNAL_ENTRY_MODULE,
          entityName: JOURNAL_ENTRY_ENTITY_NAME,
          recordId: entry.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toJournalEntryAuditValues(entry),
        });

        return toJournalEntryDto(entry);
      },
    );
  }
}
