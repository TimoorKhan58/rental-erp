import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^[+]?[\d\s()-]+$/, "Invalid phone number format");

const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .optional()
  .nullable()
  .or(z.literal(""));

export const createSupplierFormSchema = z.object({
  supplierCode: z.string().trim().min(1, "Supplier code is required").max(50),
  name: z.string().trim().min(1, "Supplier name is required").max(200),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().trim().min(1, "Address is required").max(500),
  notes: z.string().trim().max(2000).optional().nullable().or(z.literal("")),
  isActive: z.boolean(),
});

export const updateSupplierFormSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(200),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().trim().min(1, "Address is required").max(500),
  notes: z.string().trim().max(2000).optional().nullable().or(z.literal("")),
  isActive: z.boolean(),
});

export type CreateSupplierFormValues = z.infer<typeof createSupplierFormSchema>;
export type UpdateSupplierFormValues = z.infer<typeof updateSupplierFormSchema>;
