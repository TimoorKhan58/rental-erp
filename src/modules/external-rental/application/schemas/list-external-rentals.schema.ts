import {
  DateSchema,
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import {
  EXTERNAL_RENTAL_SETTLEMENT_STATUSES,
  EXTERNAL_RENTAL_SORT_FIELDS,
} from "@/modules/external-rental/domain";

import { ExternalRentalStatusFilterSchema } from "./external-rental.schemas";

export const ListExternalRentalsSchema = PaginationSchema.extend({
  status: ExternalRentalStatusFilterSchema.optional(),
  settlementStatus: z.enum(EXTERNAL_RENTAL_SETTLEMENT_STATUSES).optional(),
  supplierId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  rentalOrderId: UUIDSchema.optional(),
  hireStartFrom: DateSchema.optional(),
  hireStartTo: DateSchema.optional(),
  sortBy: z.enum(EXTERNAL_RENTAL_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListExternalRentalsInput = z.infer<typeof ListExternalRentalsSchema>;
