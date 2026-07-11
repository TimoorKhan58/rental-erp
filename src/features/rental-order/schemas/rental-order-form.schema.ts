import { z } from "zod";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const lineItemSchema = z.object({
  productId: z.string().uuid("Select a product"),
  quantity: z
    .number({ message: "Enter a valid quantity" })
    .int("Must be a whole number")
    .positive("Quantity must be greater than zero"),
  dailyRate: z
    .number({ message: "Enter a valid rate" })
    .positive("Daily rate must be greater than zero"),
});

const lineItemsRefinement = (items: Array<{ productId: string }>, ctx: z.RefinementCtx) => {
  const productIds = items.map((item) => item.productId);
  const uniqueIds = new Set(productIds);

  if (uniqueIds.size !== productIds.length) {
    ctx.addIssue({
      code: "custom",
      message: "Each product can only appear once per rental order",
      path: ["items"],
    });
  }
};

const dateRangeRefinement = (
  data: { startDate: string; endDate: string },
  ctx: z.RefinementCtx,
) => {
  if (new Date(data.endDate).getTime() <= new Date(data.startDate).getTime()) {
    ctx.addIssue({
      code: "custom",
      message: "End date must be after start date",
      path: ["endDate"],
    });
  }
};

export const createRentalOrderFormSchema = z
  .object({
    orderNumber: z.string().trim().min(1, "Order number is required").max(50),
    customerId: z.string().uuid("Select a customer"),
    warehouseId: z.string().uuid("Select a warehouse"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    remarks: optionalTextSchema(500),
    items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  })
  .superRefine((data, ctx) => {
    lineItemsRefinement(data.items, ctx);
    dateRangeRefinement(data, ctx);
  });

export const updateRentalOrderFormSchema = z
  .object({
    customerId: z.string().uuid("Select a customer"),
    warehouseId: z.string().uuid("Select a warehouse"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    remarks: optionalTextSchema(500),
    items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  })
  .superRefine((data, ctx) => {
    lineItemsRefinement(data.items, ctx);
    dateRangeRefinement(data, ctx);
  });

export const reserveRentalOrderFormSchema = z.object({
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
          message: "Enter a quantity to reserve for at least one line",
          path: ["items"],
        });
      }

      items.forEach((item, index) => {
        if (item.quantity > item.maxQuantity) {
          ctx.addIssue({
            code: "custom",
            message: `Cannot reserve more than ${item.maxQuantity}`,
            path: ["items", index, "quantity"],
          });
        }
      });
    }),
});

export type CreateRentalOrderFormValues = z.infer<typeof createRentalOrderFormSchema>;
export type UpdateRentalOrderFormValues = z.infer<typeof updateRentalOrderFormSchema>;
export type ReserveRentalOrderFormValues = z.infer<typeof reserveRentalOrderFormSchema>;
export type RentalOrderLineItemFormValues = z.infer<typeof lineItemSchema>;
