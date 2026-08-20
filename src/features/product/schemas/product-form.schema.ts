import { z } from "zod";

const optionalUuidSchema = z
  .string()
  .uuid("Invalid selection")
  .optional()
  .nullable()
  .or(z.literal(""));

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const productImageFormSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required").max(2000),
  altText: optionalTextSchema(500),
  isPrimary: z.boolean().optional(),
});

const productSpecificationFormSchema = z.object({
  key: z.string().trim().min(1, "Key is required").max(100),
  value: z.string().trim().min(1, "Value is required").max(500),
});

const productAttributeValueFormSchema = z.object({
  attributeId: z.string().uuid(),
  value: z.string().trim().min(1).max(500),
});

const productMetadataSchema = {
  tagIds: z.array(z.string().uuid()).optional(),
  images: z.array(productImageFormSchema).optional(),
  specifications: z.array(productSpecificationFormSchema).optional(),
  attributeValues: z.array(productAttributeValueFormSchema).optional(),
};

export const createProductFormSchema = z.object({
  productCode: z.string().trim().max(50).optional().or(z.literal("")),
  name: z.string().trim().min(1, "Product name is required").max(200),
  description: optionalTextSchema(2000),
  unit: z.string().trim().min(1, "Unit is required").max(50),
  rentalRate: z.number().positive("Rental rate must be greater than zero"),
  replacementCost: z.number().nonnegative().nullable().optional(),
  categoryId: optionalUuidSchema,
  brandId: optionalUuidSchema,
  unitId: optionalUuidSchema,
  isActive: z.boolean(),
  ...productMetadataSchema,
});

export const updateProductFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  description: optionalTextSchema(2000),
  unit: z.string().trim().min(1, "Unit is required").max(50),
  rentalRate: z.number().positive("Rental rate must be greater than zero"),
  replacementCost: z.number().nonnegative().nullable().optional(),
  categoryId: optionalUuidSchema,
  brandId: optionalUuidSchema,
  unitId: optionalUuidSchema,
  isActive: z.boolean(),
  ...productMetadataSchema,
});

export type CreateProductFormValues = z.infer<typeof createProductFormSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductFormSchema>;
