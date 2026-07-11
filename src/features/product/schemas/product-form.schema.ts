import { z } from "zod";

const optionalUuidSchema = z
  .string()
  .uuid("Invalid selection")
  .optional()
  .nullable()
  .or(z.literal(""));

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

export const createProductFormSchema = z.object({
  productCode: z.string().trim().min(1, "Product code is required").max(50),
  name: z.string().trim().min(1, "Product name is required").max(200),
  description: optionalTextSchema(2000),
  unit: z.string().trim().min(1, "Unit is required").max(50),
  rentalRate: z.number().positive("Rental rate must be greater than zero"),
  replacementCost: z.number().nonnegative().nullable().optional(),
  categoryId: optionalUuidSchema,
  brandId: optionalUuidSchema,
  unitId: optionalUuidSchema,
  isActive: z.boolean(),
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
});

export type CreateProductFormValues = z.infer<typeof createProductFormSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductFormSchema>;
