import { z } from "zod";

import { PaginationSchema, UUIDSchema } from "@/shared/application/validation";

import { PAYMENT_SORT_FIELDS } from "@/modules/payment/domain/payment.constants";

import { PaymentStatusFilterSchema } from "./payment.schemas";

export const ListPaymentsSchema = PaginationSchema.extend({
  status: PaymentStatusFilterSchema.optional(),
  customerId: UUIDSchema.optional(),
  rentalInvoiceId: UUIDSchema.optional(),
  sortBy: z.enum(PAYMENT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListPaymentsInput = z.infer<typeof ListPaymentsSchema>;
