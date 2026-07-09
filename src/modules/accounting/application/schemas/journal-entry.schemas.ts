import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  JOURNAL_ENTRY_STATUSES,
  JOURNAL_REFERENCE_TYPES,
} from "@/modules/accounting/domain/journal-entry.constants";

const NonNegativeAmountSchema = z.coerce.number().min(0);

export const JournalLineSchema = z.object({
  accountId: UUIDSchema,
  debit: NonNegativeAmountSchema,
  credit: NonNegativeAmountSchema,
  memo: TrimmedStringSchema.max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const JournalEntryIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateJournalEntrySchema = z.object({
  journalNumber: NonEmptyStringSchema.max(50),
  journalDate: DateSchema,
  description: NonEmptyStringSchema.max(500),
  referenceType: z.enum(JOURNAL_REFERENCE_TYPES).optional().nullable(),
  referenceId: UUIDSchema.optional().nullable(),
  lines: z.array(JournalLineSchema).min(2),
});

export const UpdateJournalEntrySchema = z
  .object({
    journalDate: DateSchema.optional(),
    description: NonEmptyStringSchema.max(500).optional(),
    referenceType: z.enum(JOURNAL_REFERENCE_TYPES).optional().nullable(),
    referenceId: UUIDSchema.optional().nullable(),
    lines: z.array(JournalLineSchema).min(2).optional(),
  })
  .refine(
    (value) =>
      value.journalDate !== undefined ||
      value.description !== undefined ||
      value.referenceType !== undefined ||
      value.referenceId !== undefined ||
      value.lines !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof UpdateJournalEntrySchema>;
export type JournalEntryIdParamInput = z.infer<typeof JournalEntryIdParamSchema>;

export const JournalEntryStatusFilterSchema = z.enum(JOURNAL_ENTRY_STATUSES);
export const JournalReferenceTypeFilterSchema = z.enum(JOURNAL_REFERENCE_TYPES);
