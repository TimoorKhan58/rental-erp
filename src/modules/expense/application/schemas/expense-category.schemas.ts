import { z } from "zod";

import {
  NonEmptyStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const ExpenseCategoryIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateExpenseCategorySchema = z.object({
  name: NonEmptyStringSchema.max(200),
  description: TrimmedStringSchema.max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateExpenseCategorySchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    description: TrimmedStringSchema.max(2000).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateExpenseCategoryInput = z.infer<
  typeof CreateExpenseCategorySchema
>;
export type UpdateExpenseCategoryInput = z.infer<
  typeof UpdateExpenseCategorySchema
>;
export type ExpenseCategoryIdParamInput = z.infer<
  typeof ExpenseCategoryIdParamSchema
>;
