import { z } from "zod";

import { ACCOUNT_TYPES } from "../types";

export const createAccountFormSchema = z.object({
  accountCode: z.string().trim().min(1, "Account code is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(200),
  accountType: z.enum(ACCOUNT_TYPES),
  description: z.string().max(500).optional(),
});

export type CreateAccountFormValues = z.infer<typeof createAccountFormSchema>;

export const createJournalEntryFormSchema = z
  .object({
    journalNumber: z.string().trim().min(1, "Journal number is required").max(50),
    journalDate: z.string().min(1, "Journal date is required"),
    description: z.string().trim().min(1, "Description is required").max(500),
    debitAccountId: z.string().uuid("Select a debit account"),
    creditAccountId: z.string().uuid("Select a credit account"),
    amount: z
      .string()
      .trim()
      .min(1, "Amount is required")
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
        message: "Amount must be greater than zero",
      }),
    memo: z.string().max(500).optional(),
  })
  .refine((value) => value.debitAccountId !== value.creditAccountId, {
    message: "Debit and credit accounts must differ",
    path: ["creditAccountId"],
  });

export type CreateJournalEntryFormValues = z.infer<typeof createJournalEntryFormSchema>;
