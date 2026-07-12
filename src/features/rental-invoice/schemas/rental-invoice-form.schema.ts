import { z } from "zod";
import { RENTAL_INVOICE_LINE_TYPES } from "../types";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const lineItemSchema = z.object({
  lineType: z.enum(RENTAL_INVOICE_LINE_TYPES, {
    message: "Select a line type",
  }),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or fewer"),
  quantity: z
    .number({ message: "Enter a valid quantity" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero"),
  unitPrice: z
    .number({ message: "Enter a valid unit price" })
    .nonnegative("Unit price cannot be negative"),
});

export const createRentalInvoiceFormSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Invoice number is required")
    .max(50, "Invoice number must be 50 characters or fewer"),
  rentalOrderId: z.string().uuid("Rental order is required"),
  customerId: z.string().uuid("Customer is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  notes: optionalTextSchema(500),
  items: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

export type CreateRentalInvoiceFormValues = z.infer<
  typeof createRentalInvoiceFormSchema
>;
