import { z } from "zod";

const optionalPhoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^[+]?[\d\s()-]+$/, "Invalid phone number format")
  .optional()
  .nullable()
  .or(z.literal(""));

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

export const createWarehouseFormSchema = z.object({
  warehouseCode: z.string().trim().min(1, "Warehouse code is required").max(50),
  name: z.string().trim().min(1, "Warehouse name is required").max(200),
  description: optionalTextSchema(2000),
  address: optionalTextSchema(500),
  contactPerson: optionalTextSchema(200),
  phone: optionalPhoneSchema,
  isActive: z.boolean(),
});

export const updateWarehouseFormSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name is required").max(200),
  description: optionalTextSchema(2000),
  address: optionalTextSchema(500),
  contactPerson: optionalTextSchema(200),
  phone: optionalPhoneSchema,
  isActive: z.boolean(),
});

export type CreateWarehouseFormValues = z.infer<typeof createWarehouseFormSchema>;
export type UpdateWarehouseFormValues = z.infer<typeof updateWarehouseFormSchema>;
