import { z } from "zod";
import { DELIVERY_METHODS } from "../types";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const lineItemSchema = z.object({
  productId: z.string().uuid("Select a product"),
  rentalOrderItemId: z.string().uuid().optional().nullable().or(z.literal("")),
  quantity: z
    .number({ message: "Enter a valid quantity" })
    .int("Must be a whole number")
    .positive("Quantity must be greater than zero"),
  notes: optionalTextSchema(500),
  maxQuantity: z.number().optional(),
});

const lineItemsRefinement = (items: Array<{ productId: string }>, ctx: z.RefinementCtx) => {
  const productIds = items.map((item) => item.productId);
  const uniqueIds = new Set(productIds);

  if (uniqueIds.size !== productIds.length) {
    ctx.addIssue({
      code: "custom",
      message: "Each product can only appear once per dispatch",
      path: ["items"],
    });
  }
};

export const createDispatchFormSchema = z
  .object({
    dispatchNumber: z.string().trim().min(1, "Dispatch number is required").max(50),
    rentalOrderId: z.string().uuid("Select a rental order"),
    dispatchDate: z.string().min(1, "Dispatch date is required"),
    deliveryMethod: z.enum(DELIVERY_METHODS, { message: "Select a delivery method" }),
    vehicleNumber: optionalTextSchema(50),
    driverName: optionalTextSchema(100),
    driverPhone: optionalTextSchema(30),
    deliveryAddress: z.string().trim().min(1, "Delivery address is required").max(500),
    remarks: optionalTextSchema(500),
    items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  })
  .superRefine((data, ctx) => {
    lineItemsRefinement(data.items, ctx);

    data.items.forEach((item, index) => {
      if (item.maxQuantity !== undefined && item.quantity > item.maxQuantity) {
        ctx.addIssue({
          code: "custom",
          message: `Cannot exceed reserved quantity of ${item.maxQuantity}`,
          path: ["items", index, "quantity"],
        });
      }
    });
  });

export const updateDispatchFormSchema = z
  .object({
    dispatchDate: z.string().min(1, "Dispatch date is required"),
    deliveryMethod: z.enum(DELIVERY_METHODS, { message: "Select a delivery method" }),
    vehicleNumber: optionalTextSchema(50),
    driverName: optionalTextSchema(100),
    driverPhone: optionalTextSchema(30),
    deliveryAddress: z.string().trim().min(1, "Delivery address is required").max(500),
    remarks: optionalTextSchema(500),
    items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  })
  .superRefine((data, ctx) => {
    lineItemsRefinement(data.items, ctx);

    data.items.forEach((item, index) => {
      if (item.maxQuantity !== undefined && item.quantity > item.maxQuantity) {
        ctx.addIssue({
          code: "custom",
          message: `Cannot exceed reserved quantity of ${item.maxQuantity}`,
          path: ["items", index, "quantity"],
        });
      }
    });
  });

export type CreateDispatchFormValues = z.infer<typeof createDispatchFormSchema>;
export type UpdateDispatchFormValues = z.infer<typeof updateDispatchFormSchema>;
export type DispatchLineItemFormValues = z.infer<typeof lineItemSchema>;
