import { z } from "zod";

import {
  NonEmptyStringSchema,
  PhoneSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

const CnicSchema = z
  .string()
  .trim()
  .regex(/^[\d-]{13,15}$/, "Invalid CNIC format")
  .optional()
  .nullable();

export const CustomerIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateCustomerSchema = z.object({
  customerCode: NonEmptyStringSchema.max(50),
  name: NonEmptyStringSchema.max(200),
  phone: PhoneSchema,
  cnic: CnicSchema,
  address: NonEmptyStringSchema.max(500),
  notes: TrimmedStringSchema.max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateCustomerSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    phone: PhoneSchema.optional(),
    cnic: CnicSchema,
    address: NonEmptyStringSchema.max(500).optional(),
    notes: TrimmedStringSchema.max(2000).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.phone !== undefined ||
      value.cnic !== undefined ||
      value.address !== undefined ||
      value.notes !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type CustomerIdParamInput = z.infer<typeof CustomerIdParamSchema>;
