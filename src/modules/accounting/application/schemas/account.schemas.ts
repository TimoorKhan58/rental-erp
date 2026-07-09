import { z } from "zod";

import {
  NonEmptyStringSchema,
  TrimmedStringSchema,
} from "@/shared/application/validation";

import { ACCOUNT_TYPES } from "@/modules/accounting/domain/account.constants";

export const AccountIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const CreateAccountSchema = z.object({
  accountCode: NonEmptyStringSchema.max(50),
  name: NonEmptyStringSchema.max(200),
  accountType: z.enum(ACCOUNT_TYPES),
  description: TrimmedStringSchema.max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateAccountSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    accountType: z.enum(ACCOUNT_TYPES).optional(),
    description: TrimmedStringSchema.max(500).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.accountType !== undefined ||
      value.description !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
export type AccountIdParamInput = z.infer<typeof AccountIdParamSchema>;

export const AccountTypeFilterSchema = z.enum(ACCOUNT_TYPES);
