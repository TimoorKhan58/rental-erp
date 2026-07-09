import type { PurchaseOrderListQuery } from "@/modules/procurement/domain/purchase-order-list.query";

import type { ListPurchaseOrdersInput } from "../schemas/list-purchase-orders.schema";

export function toPurchaseOrderListQuery(
  input: ListPurchaseOrdersInput,
): PurchaseOrderListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    search: input.search,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    status: input.status,
    supplierId: input.supplierId,
    warehouseId: input.warehouseId,
  };
}
