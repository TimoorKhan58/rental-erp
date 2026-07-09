import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  PaginationSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  MAINTENANCE_SERVICE_TYPES,
  MAINTENANCE_SORT_FIELDS,
  MAINTENANCE_STATUSES,
} from "@/modules/maintenance/domain";

export const MaintenanceIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateMaintenanceSchema = z.object({
  maintenanceNumber: NonEmptyStringSchema.max(50),
  productId: UUIDSchema,
  warehouseId: UUIDSchema,
  inventoryId: UUIDSchema,
  quantity: PositiveIntSchema,
  serviceType: z.enum(MAINTENANCE_SERVICE_TYPES),
  technician: TrimmedStringSchema.max(100).optional().nullable(),
  vendor: TrimmedStringSchema.max(100).optional().nullable(),
  scheduledDate: DateSchema,
  estimatedCost: z.coerce.number().min(0),
  actualCost: z.coerce.number().min(0).optional(),
  notes: TrimmedStringSchema.max(500).optional().nullable(),
});

export const UpdateMaintenanceSchema = z
  .object({
    quantity: PositiveIntSchema.optional(),
    serviceType: z.enum(MAINTENANCE_SERVICE_TYPES).optional(),
    technician: TrimmedStringSchema.max(100).optional().nullable(),
    vendor: TrimmedStringSchema.max(100).optional().nullable(),
    scheduledDate: DateSchema.optional(),
    estimatedCost: z.coerce.number().min(0).optional(),
    actualCost: z.coerce.number().min(0).optional(),
    notes: TrimmedStringSchema.max(500).optional().nullable(),
  })
  .refine(
    (value) =>
      value.quantity !== undefined ||
      value.serviceType !== undefined ||
      value.technician !== undefined ||
      value.vendor !== undefined ||
      value.scheduledDate !== undefined ||
      value.estimatedCost !== undefined ||
      value.actualCost !== undefined ||
      value.notes !== undefined,
    { message: "At least one field must be provided for update" },
  );

export const ListMaintenancesSchema = PaginationSchema.extend({
  status: z.enum(MAINTENANCE_STATUSES).optional(),
  productId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  inventoryId: UUIDSchema.optional(),
  sortBy: z.enum(MAINTENANCE_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type CreateMaintenanceInput = z.infer<typeof CreateMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof UpdateMaintenanceSchema>;
export type MaintenanceIdParamInput = z.infer<typeof MaintenanceIdParamSchema>;
export type ListMaintenancesInput = z.infer<typeof ListMaintenancesSchema>;
