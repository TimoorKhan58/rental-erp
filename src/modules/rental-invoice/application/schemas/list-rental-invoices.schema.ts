import { z } from "zod";

import { PaginationSchema, UUIDSchema } from "@/shared/application/validation";

import { RENTAL_INVOICE_SORT_FIELDS } from "@/modules/rental-invoice/domain/rental-invoice.constants";

import { RentalInvoiceStatusFilterSchema } from "./rental-invoice.schemas";

export const ListRentalInvoicesSchema = PaginationSchema.extend({
  status: RentalInvoiceStatusFilterSchema.optional(),
  customerId: UUIDSchema.optional(),
  rentalOrderId: UUIDSchema.optional(),
  sortBy: z.enum(RENTAL_INVOICE_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListRentalInvoicesInput = z.infer<typeof ListRentalInvoicesSchema>;
