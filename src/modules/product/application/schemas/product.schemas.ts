import { z } from "zod";

import {
  NonEmptyStringSchema,
  PositiveNumberSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

const NonNegativeNumberSchema = z.coerce.number().nonnegative();

const OptionalReplacementCostSchema = z.preprocess((value) => {
  if (value === "") {
    return null;
  }

  return value;
}, NonNegativeNumberSchema.nullable().optional());

export const ProductIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateProductSchema = z.object({
  productCode: NonEmptyStringSchema.max(50),
  name: NonEmptyStringSchema.max(200),
  description: TrimmedStringSchema.max(2000).optional().nullable(),
  unit: NonEmptyStringSchema.max(50),
  rentalRate: PositiveNumberSchema,
  replacementCost: OptionalReplacementCostSchema,
  isActive: z.boolean().optional(),
});

export const UpdateProductSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    description: TrimmedStringSchema.max(2000).optional().nullable(),
    unit: NonEmptyStringSchema.max(50).optional(),
    rentalRate: PositiveNumberSchema.optional(),
    replacementCost: OptionalReplacementCostSchema,
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.unit !== undefined ||
      value.rentalRate !== undefined ||
      value.replacementCost !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductIdParamInput = z.infer<typeof ProductIdParamSchema>;
