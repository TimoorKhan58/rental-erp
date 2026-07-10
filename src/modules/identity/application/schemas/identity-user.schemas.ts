import { z } from "zod";

import { USER_ROLE_LIST } from "@/constants/roles";
import {
  EmailSchema,
  NonEmptyStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const IdentityUserIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateIdentityUserSchema = z.object({
  name: NonEmptyStringSchema.max(200),
  email: EmailSchema,
  password: NonEmptyStringSchema.min(8).max(128),
  role: z.enum(USER_ROLE_LIST),
  isActive: z.boolean().optional(),
});

export const UpdateIdentityUserSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    email: EmailSchema.optional(),
    role: z.enum(USER_ROLE_LIST).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.role !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export const ResetIdentityUserPasswordSchema = z.object({
  password: NonEmptyStringSchema.min(8).max(128),
});

export type CreateIdentityUserInput = z.infer<typeof CreateIdentityUserSchema>;
export type UpdateIdentityUserInput = z.infer<typeof UpdateIdentityUserSchema>;
export type ResetIdentityUserPasswordInput = z.infer<
  typeof ResetIdentityUserPasswordSchema
>;
export type IdentityUserIdParamInput = z.infer<typeof IdentityUserIdParamSchema>;
