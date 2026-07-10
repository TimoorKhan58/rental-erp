import { z } from "zod";

import {
  NonEmptyStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const UnitIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateUnitSchema = z.object({
  code: NonEmptyStringSchema.max(50),
  name: NonEmptyStringSchema.max(200),
  description: TrimmedStringSchema.max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateUnitSchema = z
  .object({
    code: NonEmptyStringSchema.max(50).optional(),
    name: NonEmptyStringSchema.max(200).optional(),
    description: TrimmedStringSchema.max(2000).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.code !== undefined ||
      value.name !== undefined ||
      value.description !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;
export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>;
export type UnitIdParamInput = z.infer<typeof UnitIdParamSchema>;
