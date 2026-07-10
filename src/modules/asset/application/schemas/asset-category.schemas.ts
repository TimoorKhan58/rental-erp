import { z } from "zod";

import {
  NonEmptyStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const AssetCategoryIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateAssetCategorySchema = z.object({
  name: NonEmptyStringSchema.max(200),
  description: TrimmedStringSchema.max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateAssetCategorySchema = z
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

export type CreateAssetCategoryInput = z.infer<typeof CreateAssetCategorySchema>;
export type UpdateAssetCategoryInput = z.infer<typeof UpdateAssetCategorySchema>;
export type AssetCategoryIdParamInput = z.infer<
  typeof AssetCategoryIdParamSchema
>;
