import { z } from "zod";

import { DateSchema, TrimmedStringSchema, UUIDSchema } from "@/shared/application/validation";

import {
  PaymentMethodFilterSchema,
  PaymentStatusFilterSchema,
} from "./payment.schemas";

export const GetPaymentSummarySchema = z
  .object({
    status: PaymentStatusFilterSchema.optional(),
    paymentMethod: PaymentMethodFilterSchema.optional(),
    customerId: UUIDSchema.optional(),
    rentalInvoiceId: UUIDSchema.optional(),
    paymentDateFrom: DateSchema.optional(),
    paymentDateTo: DateSchema.optional(),
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

export type GetPaymentSummaryInput = z.infer<typeof GetPaymentSummarySchema>;
