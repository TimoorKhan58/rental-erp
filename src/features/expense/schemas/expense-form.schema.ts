import { z } from "zod";
import { EXPENSE_PAYMENT_METHODS, EXPENSE_TYPES } from "../types";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const expenseFormBaseSchema = z.object({
  expenseDate: z.string().min(1, "Expense date is required"),
  categoryId: z.string().uuid("Category is required"),
  expenseType: z.enum(EXPENSE_TYPES, { message: "Select an expense type" }),
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  paymentMethod: z
    .enum(EXPENSE_PAYMENT_METHODS, { message: "Select a payment method" })
    .optional()
    .nullable()
    .or(z.literal("")),
  supplierId: z.string().uuid().optional().nullable().or(z.literal("")),
  vendorName: optionalTextSchema(200),
  description: z.string().trim().min(1, "Description is required").max(500),
  notes: optionalTextSchema(500),
  referenceNumber: optionalTextSchema(100),
});

export const createExpenseFormSchema = expenseFormBaseSchema
  .extend({
    expenseNumber: z.string().trim().max(50).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.expenseType === "VENDOR" && !value.supplierId) {
      ctx.addIssue({
        code: "custom",
        message: "Supplier is required for vendor expenses",
        path: ["supplierId"],
      });
    }

    if (
      value.expenseType === "MANUAL" &&
      (!value.vendorName || value.vendorName.trim().length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Vendor name is required for manual expenses",
        path: ["vendorName"],
      });
    }
  });

export const updateExpenseFormSchema = expenseFormBaseSchema.superRefine(
  (value, ctx) => {
    if (value.expenseType === "VENDOR" && !value.supplierId) {
      ctx.addIssue({
        code: "custom",
        message: "Supplier is required for vendor expenses",
        path: ["supplierId"],
      });
    }

    if (
      value.expenseType === "MANUAL" &&
      (!value.vendorName || value.vendorName.trim().length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Vendor name is required for manual expenses",
        path: ["vendorName"],
      });
    }
  },
);

export const rejectExpenseFormSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, "Rejection reason is required")
    .max(500),
});

export const createExpenseCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: optionalTextSchema(500),
});

export type CreateExpenseFormValues = z.infer<typeof createExpenseFormSchema>;
export type UpdateExpenseFormValues = z.infer<typeof updateExpenseFormSchema>;
export type RejectExpenseFormValues = z.infer<typeof rejectExpenseFormSchema>;
export type CreateExpenseCategoryFormValues = z.infer<
  typeof createExpenseCategoryFormSchema
>;
