import { z } from "zod";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const lineItemSchema = z
  .object({
    rentalOrderItemId: z.string().uuid("Select a rental order item"),
    dispatchItemId: z.string().uuid().optional().nullable().or(z.literal("")),
    quantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .positive("Quantity must be greater than zero"),
    ownedQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative")
      .optional()
      .nullable(),
    externalQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative")
      .optional()
      .nullable(),
    maxQuantity: z.number().optional(),
    maxOwnedQuantity: z.number().optional(),
    maxExternalQuantity: z.number().optional(),
    requiresSourceSplit: z.boolean().optional(),
    notes: optionalTextSchema(500),
  })
  .superRefine((item, ctx) => {
    if (!item.requiresSourceSplit) {
      return;
    }

    if (item.ownedQuantity == null || item.externalQuantity == null) {
      ctx.addIssue({
        code: "custom",
        message: "Mixed-source return requires owned and external quantities",
        path: ["ownedQuantity"],
      });
      return;
    }

    if (item.ownedQuantity + item.externalQuantity !== item.quantity) {
      ctx.addIssue({
        code: "custom",
        message: "Owned + external must equal returned quantity",
        path: ["ownedQuantity"],
      });
    }

    if (
      item.maxOwnedQuantity !== undefined &&
      item.ownedQuantity > item.maxOwnedQuantity
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Cannot exceed remaining owned quantity of ${item.maxOwnedQuantity}`,
        path: ["ownedQuantity"],
      });
    }

    if (
      item.maxExternalQuantity !== undefined &&
      item.externalQuantity > item.maxExternalQuantity
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Cannot exceed remaining external quantity of ${item.maxExternalQuantity}`,
        path: ["externalQuantity"],
      });
    }
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
    returnNumber: z.string().trim().max(50).optional().or(z.literal("")),
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
    ownedQuantity: z.number().int().nonnegative().nullable().optional(),
    externalQuantity: z.number().int().nonnegative().nullable().optional(),
    requiresSourceCondition: z.boolean().optional(),
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
    missingQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative"),
    ownedGoodQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative")
      .optional(),
    ownedDamagedQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative")
      .optional(),
    ownedLostQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative")
      .optional(),
    externalGoodQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative")
      .optional(),
    externalDamagedQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative")
      .optional(),
    externalLostQuantity: z
      .number({ message: "Enter a valid quantity" })
      .int("Must be a whole number")
      .min(0, "Cannot be negative")
      .optional(),
    notes: optionalTextSchema(500),
  })
  .superRefine((item, ctx) => {
    if (item.requiresSourceCondition) {
      const ownedGood = item.ownedGoodQuantity ?? 0;
      const ownedDamaged = item.ownedDamagedQuantity ?? 0;
      const ownedLost = item.ownedLostQuantity ?? 0;
      const externalGood = item.externalGoodQuantity ?? 0;
      const externalDamaged = item.externalDamagedQuantity ?? 0;
      const externalLost = item.externalLostQuantity ?? 0;
      const ownedTotal = item.ownedQuantity ?? 0;
      const externalTotal = item.externalQuantity ?? 0;

      if (ownedGood + ownedDamaged + ownedLost !== ownedTotal) {
        ctx.addIssue({
          code: "custom",
          message: `Owned GOOD/DAMAGED/LOST must sum to ${ownedTotal}`,
          path: ["ownedGoodQuantity"],
        });
      }

      if (externalGood + externalDamaged + externalLost !== externalTotal) {
        ctx.addIssue({
          code: "custom",
          message: `External GOOD/DAMAGED/LOST must sum to ${externalTotal}`,
          path: ["externalGoodQuantity"],
        });
      }

      if (item.missingQuantity !== 0) {
        ctx.addIssue({
          code: "custom",
          message: "Missing must be 0 when using source×condition attribution",
          path: ["missingQuantity"],
        });
      }

      return;
    }

    const total =
      item.goodQuantity +
      item.damagedQuantity +
      item.lostQuantity +
      item.missingQuantity;

    if (total !== item.returnedQuantity) {
      ctx.addIssue({
        code: "custom",
        message: `Good, damaged, lost, and missing quantities must sum to ${item.returnedQuantity}`,
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
