import { z } from "zod";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

export const createRepairFormSchema = z
  .object({
    repairNumber: z.string().trim().min(1, "Repair number is required").max(50),
    returnId: z.string().uuid("Select a return"),
    returnItemId: z.string().uuid("Select a return item"),
    productId: z.string().uuid("Product is required"),
    warehouseId: z.string().uuid("Warehouse is required"),
    quantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .positive("Quantity must be greater than zero"),
    repairCost: z
      .number({ message: "Enter a valid cost" })
      .min(0, "Cost cannot be negative"),
    repairDate: z.string().min(1, "Repair date is required"),
    repairNotes: optionalTextSchema(500),
    technician: optionalTextSchema(100),
    maxQuantity: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.maxQuantity !== undefined && data.quantity > data.maxQuantity) {
      ctx.addIssue({
        code: "custom",
        message: `Cannot exceed remaining damaged quantity of ${data.maxQuantity}`,
        path: ["quantity"],
      });
    }
  });

export const updateRepairFormSchema = z.object({
  quantity: z
    .number({ message: "Enter a valid quantity" })
    .int("Must be a whole number")
    .positive("Quantity must be greater than zero"),
  repairCost: z
    .number({ message: "Enter a valid cost" })
    .min(0, "Cost cannot be negative"),
  repairDate: z.string().min(1, "Repair date is required"),
  repairNotes: optionalTextSchema(500),
  technician: optionalTextSchema(100),
  maxQuantity: z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.maxQuantity !== undefined && data.quantity > data.maxQuantity) {
    ctx.addIssue({
      code: "custom",
      message: `Cannot exceed remaining damaged quantity of ${data.maxQuantity}`,
      path: ["quantity"],
    });
  }
});

export type CreateRepairFormValues = z.infer<typeof createRepairFormSchema>;
export type UpdateRepairFormValues = z.infer<typeof updateRepairFormSchema>;
