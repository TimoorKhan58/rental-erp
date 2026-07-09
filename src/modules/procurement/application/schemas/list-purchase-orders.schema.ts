import {
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
  sortBy: z.enum(PURCHASE_ORDER_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListPurchaseOrdersInput = z.infer<typeof ListPurchaseOrdersSchema>;
