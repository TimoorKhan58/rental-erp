import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
  EXPENSE_TYPES,
} from "@/modules/expense/domain/expense.constants";

const PositiveAmountSchema = z.coerce.number().positive();

export const ExpenseIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateExpenseSchema = z
  .object({
    expenseNumber: NonEmptyStringSchema.max(50),
    expenseDate: DateSchema,
    categoryId: UUIDSchema,
    expenseType: z.enum(EXPENSE_TYPES),
    amount: PositiveAmountSchema,
    paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional().nullable(),
    supplierId: UUIDSchema.optional().nullable(),
    vendorName: TrimmedStringSchema.max(200).optional().nullable(),
    description: NonEmptyStringSchema.max(500),
    notes: TrimmedStringSchema.max(500).optional().nullable(),
    attachmentRef: TrimmedStringSchema.max(500).optional().nullable(),
    referenceNumber: TrimmedStringSchema.max(100).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.expenseType === "VENDOR" &&
      (value.supplierId === null || value.supplierId === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Supplier is required for vendor expenses",
        path: ["supplierId"],
      });
    }

    if (
      value.expenseType === "MANUAL" &&
      (value.vendorName === null ||
        value.vendorName === undefined ||
        value.vendorName.trim().length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Vendor name is required for manual expenses",
        path: ["vendorName"],
      });
    }
  });

export const UpdateExpenseSchema = z
  .object({
    expenseDate: DateSchema.optional(),
    categoryId: UUIDSchema.optional(),
    expenseType: z.enum(EXPENSE_TYPES).optional(),
    amount: PositiveAmountSchema.optional(),
    paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional().nullable(),
    supplierId: UUIDSchema.optional().nullable(),
    vendorName: TrimmedStringSchema.max(200).optional().nullable(),
    description: NonEmptyStringSchema.max(500).optional(),
    notes: TrimmedStringSchema.max(500).optional().nullable(),
    attachmentRef: TrimmedStringSchema.max(500).optional().nullable(),
    referenceNumber: TrimmedStringSchema.max(100).optional().nullable(),
  })
  .refine(
    (value) =>
      value.expenseDate !== undefined ||
      value.categoryId !== undefined ||
      value.expenseType !== undefined ||
      value.amount !== undefined ||
      value.paymentMethod !== undefined ||
      value.supplierId !== undefined ||
      value.vendorName !== undefined ||
      value.description !== undefined ||
      value.notes !== undefined ||
      value.attachmentRef !== undefined ||
      value.referenceNumber !== undefined,
    { message: "At least one field must be provided for update" },
  );

export const RejectExpenseSchema = z.object({
  rejectionReason: NonEmptyStringSchema.max(500),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type RejectExpenseInput = z.infer<typeof RejectExpenseSchema>;
export type ExpenseIdParamInput = z.infer<typeof ExpenseIdParamSchema>;

export const ExpenseStatusFilterSchema = z.enum(EXPENSE_STATUSES);
