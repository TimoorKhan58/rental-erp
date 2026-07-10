import { z } from "zod";

import { DOCUMENT_TYPES } from "@/modules/settings/domain/settings.constants";
import {
  NonEmptyStringSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const NumberSequenceIdParamSchema = z.object({
  id: UUIDSchema,
});

export const DocumentTypeParamSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
});

export const UpdateNumberSequenceSchema = z
  .object({
    prefix: NonEmptyStringSchema.max(20).optional(),
    suffix: TrimmedStringSchema.max(20).optional().nullable(),
    startingNumber: PositiveIntSchema.optional(),
    paddingLength: z.coerce.number().int().min(1).max(12).optional(),
  })
  .refine(
    (value) =>
      value.prefix !== undefined ||
      value.suffix !== undefined ||
      value.startingNumber !== undefined ||
      value.paddingLength !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type NumberSequenceIdParamInput = z.infer<
  typeof NumberSequenceIdParamSchema
>;
export type DocumentTypeParamInput = z.infer<typeof DocumentTypeParamSchema>;
export type UpdateNumberSequenceInput = z.infer<
  typeof UpdateNumberSequenceSchema
>;
