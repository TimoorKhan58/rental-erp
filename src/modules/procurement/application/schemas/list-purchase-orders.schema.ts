import {
  DateSchema,
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import { PURCHASE_ORDER_SORT_FIELDS } from "@/modules/procurement/domain/purchase-order.constants";

import { PurchaseOrderStatusFilterSchema } from "./purchase-order.schemas";

export const ListPurchaseOrdersSchema = PaginationSchema.extend({
  status: PurchaseOrderStatusFilterSchema.optional(),
  supplierId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  orderDateFrom: DateSchema.optional(),
  orderDateTo: DateSchema.optional(),
  sortBy: z.enum(PURCHASE_ORDER_SORT_FIELDS).optional(),
})
  .superRefine((value, ctx) => {
    if (value.search !== undefined && value.search.length > 200) {
      ctx.addIssue({
        code: "custom",
        message: "Search term must not exceed 200 characters",
        path: ["search"],
      });
    }
  })
  .superRefine((value, ctx) => {
    if (
      value.orderDateFrom !== undefined &&
      value.orderDateTo !== undefined &&
      value.orderDateFrom > value.orderDateTo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "orderDateFrom must be on or before orderDateTo",
        path: ["orderDateTo"],
      });
    }
  });

export type ListPurchaseOrdersInput = z.infer<typeof ListPurchaseOrdersSchema>;
