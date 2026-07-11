import { z } from "zod";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const lineItemSchema = z.object({
  productId: z.string().uuid("Select a product"),
  quantity: z
    .number({ message: "Enter a valid quantity" })
    .int("Must be a whole number")
    .positive("Quantity must be greater than zero"),
  unitCost: z
    .number({ message: "Enter a valid cost" })
    .nonnegative("Unit cost must be zero or greater"),
});

const lineItemsRefinement = (items: Array<{ productId: string }>, ctx: z.RefinementCtx) => {
  const productIds = items.map((item) => item.productId);
  const uniqueIds = new Set(productIds);

  if (uniqueIds.size !== productIds.length) {
    ctx.addIssue({
      code: "custom",
      message: "Each product can only appear once per purchase order",
      path: ["items"],
    });
  }
};

export const createProcurementFormSchema = z
  .object({
    poNumber: z.string().trim().min(1, "PO number is required").max(50),
    supplierId: z.string().uuid("Select a supplier"),
    warehouseId: z.string().uuid("Select a warehouse"),
    orderDate: z.string().min(1, "Order date is required"),
    expectedDate: z.string().optional().nullable().or(z.literal("")),
    remarks: optionalTextSchema(500),
    items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  })
  .superRefine((data, ctx) => lineItemsRefinement(data.items, ctx));

export const updateProcurementFormSchema = z
  .object({
    supplierId: z.string().uuid("Select a supplier"),
    warehouseId: z.string().uuid("Select a warehouse"),
    orderDate: z.string().min(1, "Order date is required"),
    expectedDate: z.string().optional().nullable().or(z.literal("")),
    remarks: optionalTextSchema(500),
    items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  })
  .superRefine((data, ctx) => lineItemsRefinement(data.items, ctx));

export const receiveProcurementFormSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z
          .number({ message: "Enter a valid quantity" })
          .int("Must be a whole number")
          .positive("Quantity must be greater than zero"),
        maxQuantity: z.number(),
      }),
    )
    .min(1)
    .superRefine((items, ctx) => {
      const hasPositive = items.some((item) => item.quantity > 0);

      if (!hasPositive) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a quantity to receive for at least one line",
          path: ["items"],
        });
      }

      items.forEach((item, index) => {
        if (item.quantity > item.maxQuantity) {
          ctx.addIssue({
            code: "custom",
            message: `Cannot receive more than ${item.maxQuantity}`,
            path: ["items", index, "quantity"],
          });
        }
      });
    }),
});

export type CreateProcurementFormValues = z.infer<typeof createProcurementFormSchema>;
export type UpdateProcurementFormValues = z.infer<typeof updateProcurementFormSchema>;
export type ReceiveProcurementFormValues = z.infer<typeof receiveProcurementFormSchema>;
export type ProcurementLineItemFormValues = z.infer<typeof lineItemSchema>;
