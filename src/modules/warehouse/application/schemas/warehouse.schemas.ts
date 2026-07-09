import { z } from "zod";

import {
  NonEmptyStringSchema,
  PhoneSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

const OptionalPhoneSchema = z.preprocess((value) => {
  if (value === "") {
    return null;
  }

  return value;
}, PhoneSchema.nullable().optional());

export const WarehouseIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateWarehouseSchema = z.object({
  warehouseCode: NonEmptyStringSchema.max(50),
  name: NonEmptyStringSchema.max(200),
  description: TrimmedStringSchema.max(2000).optional().nullable(),
  address: TrimmedStringSchema.max(500).optional().nullable(),
  contactPerson: TrimmedStringSchema.max(200).optional().nullable(),
  phone: OptionalPhoneSchema,
  isActive: z.boolean().optional(),
});

export const UpdateWarehouseSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    description: TrimmedStringSchema.max(2000).optional().nullable(),
    address: TrimmedStringSchema.max(500).optional().nullable(),
    contactPerson: TrimmedStringSchema.max(200).optional().nullable(),
    phone: OptionalPhoneSchema,
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.address !== undefined ||
      value.contactPerson !== undefined ||
      value.phone !== undefined ||
      value.isActive !== undefined,
    { message: "At least one field must be provided for update" },
  );

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;
export type WarehouseIdParamInput = z.infer<typeof WarehouseIdParamSchema>;
