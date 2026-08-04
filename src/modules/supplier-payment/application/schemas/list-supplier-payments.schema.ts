import { z } from "zod";

import { PaginationSchema, UUIDSchema } from "@/shared/application/validation";

import { SUPPLIER_PAYMENT_SORT_FIELDS } from "@/modules/supplier-payment/domain/supplier-payment.constants";

import { SupplierPaymentStatusFilterSchema } from "./supplier-payment.schemas";

export const ListSupplierPaymentsSchema = PaginationSchema.extend({
  status: SupplierPaymentStatusFilterSchema.optional(),
  supplierId: UUIDSchema.optional(),
  purchaseOrderId: UUIDSchema.optional(),
  sortBy: z.enum(SUPPLIER_PAYMENT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListSupplierPaymentsInput = z.infer<
  typeof ListSupplierPaymentsSchema
>;
