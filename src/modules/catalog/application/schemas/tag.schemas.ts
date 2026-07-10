import { z } from "zod";

import {
  NonEmptyStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const TagIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateTagSchema = z.object({
  name: NonEmptyStringSchema.max(200),
  color: TrimmedStringSchema.max(7).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateTagSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    color: TrimmedStringSchema.max(7).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.color !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type TagIdParamInput = z.infer<typeof TagIdParamSchema>;
