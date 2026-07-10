import { ATTRIBUTE_DATA_TYPES } from "@/modules/catalog/domain";
import { z } from "zod";

import {
  NonEmptyStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const AttributeIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateAttributeSchema = z.object({
  name: NonEmptyStringSchema.max(200),
  dataType: z.enum(ATTRIBUTE_DATA_TYPES).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateAttributeSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    dataType: z.enum(ATTRIBUTE_DATA_TYPES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.dataType !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateAttributeInput = z.infer<typeof CreateAttributeSchema>;
export type UpdateAttributeInput = z.infer<typeof UpdateAttributeSchema>;
export type AttributeIdParamInput = z.infer<typeof AttributeIdParamSchema>;
