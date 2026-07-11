import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^[+]?[\d\s()-]+$/, "Invalid phone number format");

const cnicSchema = z
  .string()
  .trim()
  .regex(/^[\d-]{13,15}$/, "Invalid CNIC format")
  .optional()
  .nullable()
  .or(z.literal(""));

export const createCustomerFormSchema = z.object({
  customerCode: z.string().trim().min(1, "Customer code is required").max(50),
  name: z.string().trim().min(1, "Customer name is required").max(200),
  phone: phoneSchema,
  cnic: cnicSchema,
  address: z.string().trim().min(1, "Address is required").max(500),
  notes: z.string().trim().max(2000).optional().nullable().or(z.literal("")),
  isActive: z.boolean(),
});

export const updateCustomerFormSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(200),
  phone: phoneSchema,
  cnic: cnicSchema,
  address: z.string().trim().min(1, "Address is required").max(500),
  notes: z.string().trim().max(2000).optional().nullable().or(z.literal("")),
  isActive: z.boolean(),
});

export type CreateCustomerFormValues = z.infer<typeof createCustomerFormSchema>;
export type UpdateCustomerFormValues = z.infer<typeof updateCustomerFormSchema>;
