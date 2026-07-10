import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

const NonNegativeNumberSchema = z.coerce.number().nonnegative();

export const AssetIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateAssetSchema = z.object({
  assetCode: NonEmptyStringSchema.max(50),
  name: NonEmptyStringSchema.max(200),
  categoryId: UUIDSchema,
  serialNumber: TrimmedStringSchema.max(100).optional().nullable(),
  purchaseDate: DateSchema,
  purchaseCost: NonNegativeNumberSchema,
  residualValue: NonNegativeNumberSchema,
  usefulLifeMonths: PositiveIntSchema,
  warehouseId: UUIDSchema,
  assignedEmployeeId: UUIDSchema.optional().nullable(),
  vendorId: UUIDSchema.optional().nullable(),
  notes: TrimmedStringSchema.max(2000).optional().nullable(),
});

export const UpdateAssetSchema = z
  .object({
    name: NonEmptyStringSchema.max(200).optional(),
    categoryId: UUIDSchema.optional(),
    serialNumber: TrimmedStringSchema.max(100).optional().nullable(),
    purchaseDate: DateSchema.optional(),
    purchaseCost: NonNegativeNumberSchema.optional(),
    residualValue: NonNegativeNumberSchema.optional(),
    usefulLifeMonths: PositiveIntSchema.optional(),
    warehouseId: UUIDSchema.optional(),
    assignedEmployeeId: UUIDSchema.optional().nullable(),
    vendorId: UUIDSchema.optional().nullable(),
    notes: TrimmedStringSchema.max(2000).optional().nullable(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.categoryId !== undefined ||
      value.serialNumber !== undefined ||
      value.purchaseDate !== undefined ||
      value.purchaseCost !== undefined ||
      value.residualValue !== undefined ||
      value.usefulLifeMonths !== undefined ||
      value.warehouseId !== undefined ||
      value.assignedEmployeeId !== undefined ||
      value.vendorId !== undefined ||
      value.notes !== undefined,
    { message: "At least one field must be provided for update" },
  );

export const TransferAssetSchema = z.object({
  toWarehouseId: UUIDSchema,
  transferDate: DateSchema,
  reason: TrimmedStringSchema.max(500).optional().nullable(),
});

export const DisposeAssetSchema = z.object({
  disposalDate: DateSchema,
  disposalAmount: NonNegativeNumberSchema.optional().nullable(),
  disposalReason: TrimmedStringSchema.max(500).optional().nullable(),
});

export const AddMaintenanceHistorySchema = z.object({
  serviceDate: DateSchema,
  vendor: TrimmedStringSchema.max(200).optional().nullable(),
  cost: NonNegativeNumberSchema,
  description: NonEmptyStringSchema.max(2000),
  setUnderMaintenance: z.boolean().optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
export type AssetIdParamInput = z.infer<typeof AssetIdParamSchema>;
export type TransferAssetInput = z.infer<typeof TransferAssetSchema>;
export type DisposeAssetInput = z.infer<typeof DisposeAssetSchema>;
export type AddMaintenanceHistoryInput = z.infer<
  typeof AddMaintenanceHistorySchema
>;
