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

const ProductImageSchema = z.object({
  url: NonEmptyStringSchema.max(2000),
  altText: TrimmedStringSchema.max(500).optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
  isPrimary: z.boolean().optional(),
});

const ProductSpecificationSchema = z.object({
  key: NonEmptyStringSchema.max(100),
  value: NonEmptyStringSchema.max(500),
  sortOrder: z.number().int().nonnegative().optional(),
});

const ProductAttributeValueSchema = z.object({
  attributeId: UUIDSchema,
  value: NonEmptyStringSchema.max(500),
});

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
  categoryId: UUIDSchema.optional().nullable(),
  brandId: UUIDSchema.optional().nullable(),
  unitId: UUIDSchema.optional().nullable(),
  tagIds: z.array(UUIDSchema).optional(),
  images: z.array(ProductImageSchema).optional(),
  specifications: z.array(ProductSpecificationSchema).optional(),
  attributeValues: z.array(ProductAttributeValueSchema).optional(),
});

export const UpdateProductSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    description: TrimmedStringSchema.max(2000).optional().nullable(),
    unit: NonEmptyStringSchema.max(50).optional(),
    rentalRate: PositiveNumberSchema.optional(),
    replacementCost: OptionalReplacementCostSchema,
    isActive: z.boolean().optional(),
    categoryId: UUIDSchema.optional().nullable(),
    brandId: UUIDSchema.optional().nullable(),
    unitId: UUIDSchema.optional().nullable(),
    tagIds: z.array(UUIDSchema).optional(),
    images: z.array(ProductImageSchema).optional(),
    specifications: z.array(ProductSpecificationSchema).optional(),
    attributeValues: z.array(ProductAttributeValueSchema).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.unit !== undefined ||
      value.rentalRate !== undefined ||
      value.replacementCost !== undefined ||
      value.isActive !== undefined ||
      value.categoryId !== undefined ||
      value.brandId !== undefined ||
      value.unitId !== undefined ||
      value.tagIds !== undefined ||
      value.images !== undefined ||
      value.specifications !== undefined ||
      value.attributeValues !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductIdParamInput = z.infer<typeof ProductIdParamSchema>;
