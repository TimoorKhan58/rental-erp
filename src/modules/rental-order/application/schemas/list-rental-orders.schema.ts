import { PaginationSchema, UUIDSchema } from "@/shared/application/validation";
import { z } from "zod";

import { RENTAL_ORDER_SORT_FIELDS } from "@/modules/rental-order/domain/rental-order.constants";

import { RentalOrderStatusFilterSchema } from "./rental-order.schemas";

export const ListRentalOrdersSchema = PaginationSchema.extend({
  status: RentalOrderStatusFilterSchema.optional(),
  customerId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  sortBy: z.enum(RENTAL_ORDER_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListRentalOrdersInput = z.infer<typeof ListRentalOrdersSchema>;
