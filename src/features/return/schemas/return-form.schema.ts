import { z } from "zod";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const lineItemSchema = z.object({
  rentalOrderItemId: z.string().uuid("Select a rental order item"),
  dispatchItemId: z.string().uuid().optional().nullable().or(z.literal("")),
  quantity: z
    .number({ message: "Enter a valid quantity" })
    .int("Must be a whole number")
    .positive("Quantity must be greater than zero"),
  notes: optionalTextSchema(500),
  maxQuantity: z.number().optional(),
});

const lineItemsRefinement = (
  items: Array<{ rentalOrderItemId: string }>,
  ctx: z.RefinementCtx,
) => {
  const rentalOrderItemIds = items.map((item) => item.rentalOrderItemId);
  const uniqueIds = new Set(rentalOrderItemIds);

  if (uniqueIds.size !== rentalOrderItemIds.length) {
    ctx.addIssue({
      code: "custom",
      message: "Each rental order item can only appear once per return",
      path: ["items"],
    });
  }
};

const quantityLimitRefinement = (
  items: Array<{ quantity: number; maxQuantity?: number }>,
  ctx: z.RefinementCtx,
) => {
  items.forEach((item, index) => {
    if (item.maxQuantity !== undefined && item.quantity > item.maxQuantity) {
      ctx.addIssue({
        code: "custom",
        message: `Cannot exceed remaining dispatched quantity of ${item.maxQuantity}`,
        path: ["items", index, "quantity"],
      });
    }
  });
};

export const createReturnFormSchema = z
  .object({
    returnNumber: z.string().trim().min(1, "Return number is required").max(50),
    rentalOrderId: z.string().uuid("Select a rental order"),
    dispatchId: z.string().uuid("Select a dispatch"),
    returnDate: z.string().min(1, "Return date is required"),
    remarks: optionalTextSchema(500),
    items: z.array(lineItemSchema).min(1, "At least one returned item is required"),
  })
  .superRefine((data, ctx) => {
    lineItemsRefinement(data.items, ctx);
    quantityLimitRefinement(data.items, ctx);
  });

export const updateReturnFormSchema = z
  .object({
    returnDate: z.string().min(1, "Return date is required"),
    remarks: optionalTextSchema(500),
    items: z.array(lineItemSchema).min(1, "At least one returned item is required"),
  })
  .superRefine((data, ctx) => {
    lineItemsRefinement(data.items, ctx);
    quantityLimitRefinement(data.items, ctx);
  });

const inspectLineItemSchema = z
  .object({
    rentalOrderItemId: z.string().uuid(),
    returnedQuantity: z.number().int().nonnegative(),
    goodQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative"),
    damagedQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative"),
    lostQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative"),
    notes: optionalTextSchema(500),
  })
  .superRefine((item, ctx) => {
    const total = item.goodQuantity + item.damagedQuantity + item.lostQuantity;

    if (total !== item.returnedQuantity) {
      ctx.addIssue({
        code: "custom",
        message: `Good, damaged, and lost quantities must sum to ${item.returnedQuantity}`,
        path: ["goodQuantity"],
      });
    }
  });

export const inspectReturnFormSchema = z.object({
  items: z.array(inspectLineItemSchema).min(1, "At least one item is required"),
});

export type CreateReturnFormValues = z.infer<typeof createReturnFormSchema>;
export type UpdateReturnFormValues = z.infer<typeof updateReturnFormSchema>;
export type InspectReturnFormValues = z.infer<typeof inspectReturnFormSchema>;
export type ReturnLineItemFormValues = z.infer<typeof lineItemSchema>;
