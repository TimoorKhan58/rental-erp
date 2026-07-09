import type { PurchaseOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { PurchaseOrder } from "./purchase-order.entity";
import type { PurchaseOrderListQuery } from "./purchase-order-list.query";
import type {
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  UpdatePurchaseOrderReceiveData,
} from "./purchase-order.types";

export interface IPurchaseOrderRepository {
  findById(id: PurchaseOrderId): Promise<PurchaseOrder | null>;
  findByPoNumber(poNumber: string): Promise<PurchaseOrder | null>;
  findPaged(
    query: PurchaseOrderListQuery,
  ): Promise<PaginatedResult<PurchaseOrder>>;
  create(data: CreatePurchaseOrderData): Promise<PurchaseOrder>;
  update(
    id: PurchaseOrderId,
    data: UpdatePurchaseOrderData,
  ): Promise<PurchaseOrder>;
  updateReceive(
    id: PurchaseOrderId,
    data: UpdatePurchaseOrderReceiveData,
  ): Promise<PurchaseOrder>;
  updateStatus(
    id: PurchaseOrderId,
    status: PurchaseOrder["status"],
  ): Promise<PurchaseOrder>;
}
