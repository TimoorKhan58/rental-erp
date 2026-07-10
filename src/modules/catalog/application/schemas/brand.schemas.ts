import { z } from "zod";

import {
  NonEmptyStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const BrandIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateBrandSchema = z.object({
  name: NonEmptyStringSchema.max(200),
  description: TrimmedStringSchema.max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateBrandSchema = z
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

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>;
export type BrandIdParamInput = z.infer<typeof BrandIdParamSchema>;
