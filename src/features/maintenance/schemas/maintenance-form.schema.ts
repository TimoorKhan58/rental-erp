import { z } from "zod";
import { MAINTENANCE_SERVICE_TYPES } from "../types";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

export const createMaintenanceFormSchema = z
  .object({
    maintenanceNumber: z.string().trim().min(1, "Maintenance number is required").max(50),
    productId: z.string().uuid("Product is required"),
    warehouseId: z.string().uuid("Warehouse is required"),
    inventoryId: z.string().uuid("Select inventory"),
    quantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .positive("Quantity must be greater than zero"),
    serviceType: z.enum(MAINTENANCE_SERVICE_TYPES, { message: "Select a service type" }),
    scheduledDate: z.string().min(1, "Scheduled date is required"),
    estimatedCost: z
      .number({ message: "Enter a valid cost" })
      .min(0, "Cost cannot be negative"),
    actualCost: z
      .number({ message: "Enter a valid cost" })
      .min(0, "Cost cannot be negative")
      .optional(),
    technician: optionalTextSchema(100),
    vendor: optionalTextSchema(100),
    notes: optionalTextSchema(500),
    maxQuantity: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.maxQuantity !== undefined && data.quantity > data.maxQuantity) {
      ctx.addIssue({
        code: "custom",
        message: `Cannot exceed available inventory of ${data.maxQuantity}`,
        path: ["quantity"],
      });
    }
  });

export const updateMaintenanceFormSchema = z
  .object({
    quantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .positive("Quantity must be greater than zero"),
    serviceType: z.enum(MAINTENANCE_SERVICE_TYPES, { message: "Select a service type" }),
    scheduledDate: z.string().min(1, "Scheduled date is required"),
    estimatedCost: z
      .number({ message: "Enter a valid cost" })
      .min(0, "Cost cannot be negative"),
    actualCost: z
      .number({ message: "Enter a valid cost" })
      .min(0, "Cost cannot be negative"),
    technician: optionalTextSchema(100),
    vendor: optionalTextSchema(100),
    notes: optionalTextSchema(500),
    maxQuantity: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.maxQuantity !== undefined && data.quantity > data.maxQuantity) {
      ctx.addIssue({
        code: "custom",
        message: `Cannot exceed available inventory of ${data.maxQuantity}`,
        path: ["quantity"],
      });
    }
  });

export type CreateMaintenanceFormValues = z.infer<typeof createMaintenanceFormSchema>;
export type UpdateMaintenanceFormValues = z.infer<typeof updateMaintenanceFormSchema>;
