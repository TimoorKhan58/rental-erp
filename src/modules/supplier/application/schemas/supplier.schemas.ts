import { z } from "zod";

import {
  EmailSchema,
  NonEmptyStringSchema,
  PhoneSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

export const SupplierIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateSupplierSchema = z.object({
  supplierCode: NonEmptyStringSchema.max(50),
  name: NonEmptyStringSchema.max(200),
  phone: PhoneSchema,
  email: EmailSchema.optional().nullable(),
  address: NonEmptyStringSchema.max(500),
  notes: TrimmedStringSchema.max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateSupplierSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    phone: PhoneSchema.optional(),
    email: EmailSchema.optional().nullable(),
    address: NonEmptyStringSchema.max(500).optional(),
    notes: TrimmedStringSchema.max(2000).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.phone !== undefined ||
      value.email !== undefined ||
      value.address !== undefined ||
      value.notes !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;
export type SupplierIdParamInput = z.infer<typeof SupplierIdParamSchema>;
