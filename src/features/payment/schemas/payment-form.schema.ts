import { z } from "zod";
import { PAYMENT_METHODS } from "../types";

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

export const createPaymentFormSchema = z.object({
  paymentNumber: z.string().trim().min(1, "Payment number is required").max(50),
  customerId: z.string().uuid("Customer is required"),
  rentalInvoiceId: z.string().uuid("Invoice is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "Select a payment method" }),
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  referenceNumber: optionalTextSchema(100),
  notes: optionalTextSchema(500),
});

export const updatePaymentFormSchema = z.object({
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "Select a payment method" }),
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  referenceNumber: optionalTextSchema(100),
  notes: optionalTextSchema(500),
});

export type CreatePaymentFormValues = z.infer<typeof createPaymentFormSchema>;
export type UpdatePaymentFormValues = z.infer<typeof updatePaymentFormSchema>;
