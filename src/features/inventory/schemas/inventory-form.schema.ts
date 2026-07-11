import { z } from "zod";

const nonNegativeInt = z
  .number({ message: "Enter a valid number" })
  .int("Must be a whole number")
  .nonnegative("Must be zero or greater");

const optionalMaximumStockSchema = z
  .number()
  .int("Must be a whole number")
  .nonnegative("Must be zero or greater")
  .nullable()
  .optional();

const stockLevelRefinement = {
  reservedWithinOnHand: (data: {
    quantityOnHand: number;
    reservedQuantity: number;
  }) => data.reservedQuantity <= data.quantityOnHand,
  maximumAboveMinimum: (data: {
    minimumStock: number;
    maximumStock?: number | null;
  }) =>
    data.maximumStock === undefined ||
    data.maximumStock === null ||
    data.maximumStock >= data.minimumStock,
};

export const createInventoryFormSchema = z
  .object({
    productId: z.string().uuid("Select a product"),
    warehouseId: z.string().uuid("Select a warehouse"),
    quantityOnHand: nonNegativeInt,
    reservedQuantity: nonNegativeInt.optional(),
    minimumStock: nonNegativeInt.optional(),
    maximumStock: optionalMaximumStockSchema,
    isActive: z.boolean(),
  })
  .refine(
    (data) =>
      stockLevelRefinement.reservedWithinOnHand({
        quantityOnHand: data.quantityOnHand,
        reservedQuantity: data.reservedQuantity ?? 0,
      }),
    {
      message: "Reserved quantity cannot exceed quantity on hand",
      path: ["reservedQuantity"],
    },
  )
  .refine(
    (data) =>
      stockLevelRefinement.maximumAboveMinimum({
        minimumStock: data.minimumStock ?? 0,
        maximumStock: data.maximumStock,
      }),
    {
      message: "Maximum stock must be greater than or equal to minimum stock",
      path: ["maximumStock"],
    },
  );

export const updateInventoryFormSchema = z
  .object({
    quantityOnHand: nonNegativeInt,
    reservedQuantity: nonNegativeInt,
    minimumStock: nonNegativeInt,
    maximumStock: optionalMaximumStockSchema,
    isActive: z.boolean(),
  })
  .refine(stockLevelRefinement.reservedWithinOnHand, {
    message: "Reserved quantity cannot exceed quantity on hand",
    path: ["reservedQuantity"],
  })
  .refine(stockLevelRefinement.maximumAboveMinimum, {
    message: "Maximum stock must be greater than or equal to minimum stock",
    path: ["maximumStock"],
  });

export type CreateInventoryFormValues = z.infer<typeof createInventoryFormSchema>;
export type UpdateInventoryFormValues = z.infer<typeof updateInventoryFormSchema>;
