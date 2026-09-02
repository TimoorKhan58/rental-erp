import { z } from "zod";

import { DateSchema, TrimmedStringSchema, UUIDSchema } from "@/shared/application/validation";

import {
  RentalInvoicePaymentStatusFilterSchema,
  RentalInvoiceStatusFilterSchema,
} from "./rental-invoice.schemas";

export const GetRentalInvoiceSummarySchema = z
  .object({
    status: RentalInvoiceStatusFilterSchema.optional(),
    paymentStatus: RentalInvoicePaymentStatusFilterSchema.optional(),
    customerId: UUIDSchema.optional(),
    rentalOrderId: UUIDSchema.optional(),
    invoiceDateFrom: DateSchema.optional(),
    invoiceDateTo: DateSchema.optional(),
    search: TrimmedStringSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.search !== undefined && value.search.length > 200) {
      ctx.addIssue({
        code: "custom",
        message: "Search term must not exceed 200 characters",
        path: ["search"],
      });
    }
  });

export type GetRentalInvoiceSummaryInput = z.infer<
  typeof GetRentalInvoiceSummarySchema
>;
