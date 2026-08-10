import { z } from "zod";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

function refineResidual(
  value: { purchaseCost: number; residualValue: number },
  ctx: z.RefinementCtx,
) {
  if (value.residualValue > value.purchaseCost) {
    ctx.addIssue({
      code: "custom",
      message: "Residual value cannot exceed purchase cost",
      path: ["residualValue"],
    });
  }
}

const sharedFields = {
  name: z.string().trim().min(1, "Name is required").max(200),
  categoryId: z.string().uuid("Category is required"),
  serialNumber: optionalTextSchema(100),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  purchaseCost: z
    .number({ message: "Enter a valid purchase cost" })
    .min(0, "Purchase cost cannot be negative"),
  residualValue: z
    .number({ message: "Enter a valid residual value" })
    .min(0, "Residual value cannot be negative"),
  usefulLifeMonths: z
    .number({ message: "Enter useful life in months" })
    .int("Must be a whole number")
    .positive("Useful life must be greater than zero"),
  warehouseId: z.string().uuid("Warehouse is required"),
  assignedEmployeeId: z.string().uuid().optional().nullable().or(z.literal("")),
  vendorId: z.string().uuid().optional().nullable().or(z.literal("")),
  notes: optionalTextSchema(2000),
};

export const createAssetFormSchema = z
  .object({
    assetCode: z.string().trim().min(1, "Asset code is required").max(50),
    ...sharedFields,
  })
  .superRefine(refineResidual);

export const updateAssetFormSchema = z
  .object(sharedFields)
  .superRefine(refineResidual);

export const transferAssetFormSchema = z.object({
  toWarehouseId: z.string().uuid("Destination warehouse is required"),
  transferDate: z.string().min(1, "Transfer date is required"),
  reason: optionalTextSchema(500),
});

export const disposeAssetFormSchema = z.object({
  disposalDate: z.string().min(1, "Disposal date is required"),
  disposalAmount: z
    .number({ message: "Enter a valid amount" })
    .min(0)
    .optional()
    .nullable(),
  disposalReason: optionalTextSchema(500),
});

export const maintenanceAssetFormSchema = z.object({
  serviceDate: z.string().min(1, "Service date is required"),
  vendor: optionalTextSchema(200),
  cost: z
    .number({ message: "Enter a valid cost" })
    .min(0, "Cost cannot be negative"),
  description: z.string().trim().min(1, "Description is required").max(2000),
  setUnderMaintenance: z.boolean().optional(),
});

export const createAssetCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: optionalTextSchema(500),
});

export type CreateAssetFormValues = z.infer<typeof createAssetFormSchema>;
export type UpdateAssetFormValues = z.infer<typeof updateAssetFormSchema>;
export type TransferAssetFormValues = z.infer<typeof transferAssetFormSchema>;
export type DisposeAssetFormValues = z.infer<typeof disposeAssetFormSchema>;
export type MaintenanceAssetFormValues = z.infer<typeof maintenanceAssetFormSchema>;
export type CreateAssetCategoryFormValues = z.infer<
  typeof createAssetCategoryFormSchema
>;
