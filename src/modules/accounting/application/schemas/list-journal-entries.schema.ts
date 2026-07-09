import { z } from "zod";

import { DateSchema, PaginationSchema } from "@/shared/application/validation";

import { JOURNAL_ENTRY_SORT_FIELDS } from "@/modules/accounting/domain/journal-entry.constants";

import {
  JournalEntryStatusFilterSchema,
  JournalReferenceTypeFilterSchema,
} from "./journal-entry.schemas";

export const ListJournalEntriesSchema = PaginationSchema.extend({
  status: JournalEntryStatusFilterSchema.optional(),
  referenceType: JournalReferenceTypeFilterSchema.optional(),
  journalDateFrom: DateSchema.optional(),
  journalDateTo: DateSchema.optional(),
  sortBy: z.enum(JOURNAL_ENTRY_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListJournalEntriesInput = z.infer<typeof ListJournalEntriesSchema>;
